import { useState, useCallback } from 'react';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { Program, AnchorProvider, Idl, BN } from '@coral-xyz/anchor';
import { PublicKey, SystemProgram, Keypair, SYSVAR_RENT_PUBKEY, Transaction } from '@solana/web3.js';
import { 
  TOKEN_PROGRAM_ID, 
  MINT_SIZE, 
  getMinimumBalanceForRentExemptMint, 
  createInitializeMintInstruction, 
  getAssociatedTokenAddressSync, 
  createAssociatedTokenAccountInstruction, 
  createMintToInstruction 
} from '@solana/spl-token';

import idl from './escrow.json';
import { EscrowSummary } from '../components/EscrowCard/types';
import { fetchWithRetry } from '../utils/api';

export function useEscrowApi() {
  const [data, setData] = useState<EscrowSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 👇 Grab the network connection and the Phantom Wallet from the context!
  const { connection } = useConnection();
  const wallet = useWallet();

  const mapDbToUi = (item: any): EscrowSummary => {
    let uiStatus = item.status === 'released' ? 'completed' : item.status;
    if (uiStatus === 'disputed') uiStatus = 'active';

    return {
      requestId: item.escrowId || item.escrow_id,
      status: uiStatus,
      submitter: item.initializer,
      counterparty: item.beneficiary,
      amount: { value: Number(item.amount), currency: 'USD', token: 'USDC' },
      txHash: item.txSig || item.tx_sig,
      createdAt: item.createdAt || item.created_at,
      updatedAt: item.updatedAt || item.updated_at,
      confirmations: 1, 
      attempts: 1,
      events: [{ id: `e-${item.escrowId}`, type: 'created', message: 'Escrow deployed', ts: item.createdAt || item.created_at }]
    };
  };

  const fetchList = useCallback(async (params?: { status?: string; search?: string; page?: number }) => {
    setLoading(true);
    try {
      const res = await fetchWithRetry('/api/v1/escrow');
      let fetchedData = await res.json();
      if (fetchedData && !Array.isArray(fetchedData) && Array.isArray(fetchedData.data)) {
        fetchedData = fetchedData.data;
      }
      if (!Array.isArray(fetchedData)) throw new Error('API returned invalid data format.');

      let mappedData = fetchedData.map(mapDbToUi);
      setData(mappedData);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch escrow list');
    } finally {
      setLoading(false);
    }
  }, []);

 // 👇 THE MAGIC HAPPENS HERE: Pure Frontend Signing
  const createEscrow = useCallback(async (payload: { beneficiary: string; arbiter: string; amount: number }) => {
    if (!wallet.publicKey || !wallet.signTransaction) {
      throw new Error("Please connect your Phantom wallet first!");
    }

    // 1. Initialize Anchor Provider with Phantom
    const provider = new AnchorProvider(connection, wallet as any, { commitment: 'confirmed' });
    const program = new Program(idl as Idl, provider);

    // 👇 ADDED: Bulletproof PublicKey validation
    let beneficiaryPubkey: PublicKey;
    let arbiterPubkey: PublicKey;
    
    try {
      // .trim() removes any accidental spaces copied from the UI
      beneficiaryPubkey = new PublicKey(payload.beneficiary.trim());
      arbiterPubkey = new PublicKey(payload.arbiter.trim());
    } catch (err) {
      throw new Error("Invalid wallet address. Please check that the Beneficiary and Arbiter fields are correct Solana addresses without extra spaces.");
    }

    const initializerPubkey = wallet.publicKey; // Phantom's address!

    // 2. Derive the Escrow PDA
    const [escrowPda, bump] = PublicKey.findProgramAddressSync(
      [Buffer.from("escrow"), initializerPubkey.toBuffer(), beneficiaryPubkey.toBuffer()],
      program.programId
    );

    console.log("Building transaction...");
    
    // 3. Build Dummy Tokens in the browser (Mimicking your backend logic)
    const mintKeypair = Keypair.generate();
    const lamports = await getMinimumBalanceForRentExemptMint(connection);
    const initializerATA = getAssociatedTokenAddressSync(mintKeypair.publicKey, initializerPubkey, true);

    const tx = new Transaction().add(
      SystemProgram.createAccount({
        fromPubkey: initializerPubkey,
        newAccountPubkey: mintKeypair.publicKey,
        space: MINT_SIZE,
        lamports,
        programId: TOKEN_PROGRAM_ID,
      }),
      createInitializeMintInstruction(mintKeypair.publicKey, 6, initializerPubkey, null),
      createAssociatedTokenAccountInstruction(initializerPubkey, initializerATA, initializerPubkey, mintKeypair.publicKey),
      createMintToInstruction(mintKeypair.publicKey, initializerATA, initializerPubkey, payload.amount)
    );

    // 4. Append the Anchor Smart Contract Instruction
    const escrowIx = await program.methods
      .initializeEscrow(bump, new BN(payload.amount))
      .accounts({
        escrowAccount: escrowPda,
        initializer: initializerPubkey,
        beneficiary: beneficiaryPubkey,
        arbiter: arbiterPubkey,
        initializerTokenAccount: initializerATA,
        mint: mintKeypair.publicKey,
        systemProgram: SystemProgram.programId,
        rent: SYSVAR_RENT_PUBKEY,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .instruction();

    tx.add(escrowIx);

    // 5. Prepare Transaction for Phantom
    const latestBlockhash = await connection.getLatestBlockhash();
    tx.recentBlockhash = latestBlockhash.blockhash;
    tx.feePayer = initializerPubkey;
    
    // Partially sign with our generated dummy mint keypair first
    tx.sign(mintKeypair); 

    console.log("Waiting for Phantom Approval...");
    
    // 🚀 TRIGGER PHANTOM POPUP!
    const signature = await wallet.sendTransaction(tx, connection);
    
    // ... inside createEscrow ...
    console.log("Transaction Sent! Confirming on Solana...");
    await connection.confirmTransaction({ signature, ...latestBlockhash });

    console.log("Success! Transaction Hash:", signature);

    // 👇 NEW: Sync the CREATION to the NestJS Database!
    try {
      const token = localStorage.getItem("access_token");
      await fetchWithRetry(`/api/v1/escrow/${escrowPda.toBase58()}/sync`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ 
          status: 'CREATED', 
          txSig: signature,
          initializer: initializerPubkey.toBase58(),
          beneficiary: payload.beneficiary,
          arbiter: payload.arbiter,
          amount: payload.amount
        })
      });
      console.log("Creation synced to database!");
    } catch (err) {
      console.error("Failed to sync creation with backend:", err);
    }

    // Optimistically update the UI
    const newEscrow = mapDbToUi({
      escrowId: escrowPda.toBase58(),
      initializer: initializerPubkey.toBase58(),
      beneficiary: payload.beneficiary,
      amount: payload.amount,
      txSig: signature,
      status: 'active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });

    setData(prev => [newEscrow, ...prev]);
    return newEscrow;

  }, [wallet, connection]);

  const resolveEscrow = useCallback(async (requestId: string) => {
    if (!wallet.publicKey || !wallet.signTransaction) {
      throw new Error("Please connect your Phantom wallet first!");
    }

    const provider = new AnchorProvider(connection, wallet as any, { commitment: 'confirmed' });
    const program = new Program(idl as Idl, provider);
    const escrowPda = new PublicKey(requestId);

    console.log("Fetching Escrow State...");
    const escrowState = await (program.account as any).escrowAccount.fetch(escrowPda);
    const beneficiaryPubkey = escrowState.beneficiary as PublicKey;
    const amount = escrowState.amount as BN;

    console.log("Generating dummy tokens for resolution...");
    const mintKeypair = Keypair.generate();
    const lamports = await getMinimumBalanceForRentExemptMint(connection);

    // Derive the specific token accounts for this brand new dummy mint
    const escrowTokenAccount = getAssociatedTokenAddressSync(mintKeypair.publicKey, escrowPda, true);
    const beneficiaryTokenAccount = getAssociatedTokenAddressSync(mintKeypair.publicKey, beneficiaryPubkey, true);

    const tx = new Transaction().add(
      // 1. Create a brand new Dummy Mint on the fly
      SystemProgram.createAccount({
        fromPubkey: wallet.publicKey,
        newAccountPubkey: mintKeypair.publicKey,
        space: MINT_SIZE,
        lamports,
        programId: TOKEN_PROGRAM_ID,
      }),
      createInitializeMintInstruction(mintKeypair.publicKey, 6, wallet.publicKey, null),

      // 2. Create the Vault (PDA) Token Account & Fund it so it's not empty!
      createAssociatedTokenAccountInstruction(wallet.publicKey, escrowTokenAccount, escrowPda, mintKeypair.publicKey),
      createMintToInstruction(mintKeypair.publicKey, escrowTokenAccount, wallet.publicKey, amount.toNumber()),

      // 3. Create the Beneficiary Token Account to receive the funds
      createAssociatedTokenAccountInstruction(wallet.publicKey, beneficiaryTokenAccount, beneficiaryPubkey, mintKeypair.publicKey)
    );

    console.log("Building Release Instruction...");
    
    // 4. Append the Anchor Release Instruction
    const releaseIx = await (program.methods as any)
      .release()
      .accounts({
        escrowAccount: escrowPda,
        escrowPda: escrowPda,
        escrowTokenAccount: escrowTokenAccount,
        beneficiaryTokenAccount: beneficiaryTokenAccount,
        tokenProgram: TOKEN_PROGRAM_ID,
        arbiter: wallet.publicKey,
      })
      .instruction();

    tx.add(releaseIx);

    const latestBlockhash = await connection.getLatestBlockhash();
    tx.recentBlockhash = latestBlockhash.blockhash;
    tx.feePayer = wallet.publicKey;

    // 👇 We MUST partially sign with the dummy Mint keypair because it is creating a new account!
    tx.sign(mintKeypair);

    console.log("Waiting for Phantom Approval...");
    const signature = await wallet.sendTransaction(tx, connection);

    console.log("Transaction Sent! Confirming on Solana...");
    await connection.confirmTransaction({ signature, ...latestBlockhash });

    console.log("Successfully resolved via Phantom! Transaction Hash:", signature);

    // 👇 Sync the success back to your NestJS Database!
    try {
      const token = localStorage.getItem("access_token");
      await fetchWithRetry(`/api/v1/escrow/${requestId}/sync`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ status: 'RELEASED', txSig: signature })
      });
      console.log("Backend database synced successfully.");
    } catch (err) {
      console.error("Failed to sync with backend:", err);
    }

    // Optimistically update the UI to green "Completed" status
    setData(prev => prev.map(item => 
      item.requestId === requestId ? { ...item, status: 'completed', txHash: signature } : item
    ));

  }, [wallet, connection]);

  const raiseDispute = useCallback(async (requestId: string) => {
    const res = await fetchWithRetry(`/api/v1/escrow/${requestId}/dispute`, { method: 'POST' });
    if (!res.ok) throw new Error('Failed to raise dispute');
  }, []);

  const notifyParties = useCallback(async (requestId: string) => {
    await fetchWithRetry(`/api/v1/escrow/${requestId}/notify`, { method: 'POST' });
  }, []);

  const getEscrowDetails = useCallback(async (requestId: string) => {
    try {
      const res = await fetchWithRetry(`/api/v1/escrow/${requestId}`);
      if (!res.ok) return null;
      const item = await res.json();
      return item ? mapDbToUi(item) : null;
    } catch {
      return null;
    }
  }, []);

  return { data, loading, error, fetchList, resolveEscrow, raiseDispute, notifyParties, getEscrowDetails, createEscrow };
}



// import { useState, useCallback } from 'react';
// import { EscrowSummary } from '../components/EscrowCard/types';
// import { fetchWithRetry } from '../utils/api';

// interface UseEscrowApiResult {
//   data: EscrowSummary[];
//   loading: boolean;
//   error: string | null;
//   fetchList: (params?: { status?: string; search?: string; page?: number }) => Promise<void>;
//   resolveEscrow: (requestId: string) => Promise<void>;
//   raiseDispute: (requestId: string) => Promise<void>;
//   notifyParties: (requestId: string) => Promise<void>;
//   getEscrowDetails: (requestId: string) => Promise<EscrowSummary | null>;
//   createEscrow: (data: { beneficiary: string; arbiter: string; amount: number }) => Promise<EscrowSummary>;
// }

// export function useEscrowApi(): UseEscrowApiResult {
//   const [data, setData] = useState<EscrowSummary[]>([]);
//   const [loading, setLoading] = useState(false);
//   const [error, setError] = useState<string | null>(null);

//   // Helper function to map DB fields to UI fields
//   const mapDbToUi = (item: any): EscrowSummary => {
//     let uiStatus = item.status === 'released' ? 'completed' : item.status;
//     if (uiStatus === 'disputed') uiStatus = 'active'; // keep disputed active in UI

//     return {
//       requestId: item.escrowId || item.escrow_id,
//       status: uiStatus,
//       submitter: item.initializer,
//       counterparty: item.beneficiary,
//       amount: { value: Number(item.amount), currency: 'USD', token: 'USDC' },
//       txHash: item.txSig || item.tx_sig,
//       createdAt: item.createdAt || item.created_at,
//       updatedAt: item.updatedAt || item.updated_at,
//       confirmations: 1, 
//       attempts: 1,
//       events: [{ id: `e-${item.escrowId}`, type: 'created', message: 'Escrow deployed', ts: item.createdAt || item.created_at }]
//     };
//   };

//   const fetchList = useCallback(async (params?: { status?: string; search?: string; page?: number }) => {
//     setLoading(true);
//     setError(null);
//     try {
//       const res = await fetchWithRetry('/api/v1/escrow');
//       let fetchedData = await res.json();
//       if (fetchedData && !Array.isArray(fetchedData) && Array.isArray(fetchedData.data)) {
//         fetchedData = fetchedData.data;
//       }
//       if (!Array.isArray(fetchedData)) throw new Error('API returned invalid data format.');

//       let mappedData = fetchedData.map(mapDbToUi);

//       if (params?.status && params.status !== 'All') {
//         mappedData = mappedData.filter((item: EscrowSummary) => item.status === params.status?.toLowerCase());
//       }
//       if (params?.search) {
//         const q = params.search.toLowerCase();
//         mappedData = mappedData.filter((item: EscrowSummary) => item.requestId.toLowerCase().includes(q));
//       }

//       setData(mappedData);
//     } catch (err: any) {
//       setError(err.message || 'Failed to fetch escrow list');
//     } finally {
//       setLoading(false);
//     }
//   }, []);

//   const getEscrowDetails = useCallback(async (requestId: string) => {
//     try {
//       const res = await fetchWithRetry(`/api/v1/escrow/${requestId}`);
//       if (!res.ok) return null;
//       const item = await res.json();
//       if (!item) return null;
//       return mapDbToUi(item);
//     } catch {
//       return null;
//     }
//   }, []);

//   const resolveEscrow = useCallback(async (requestId: string) => {
//     const token = localStorage.getItem("access_token");
//     const res = await fetchWithRetry(`/api/v1/escrow/${requestId}/resolve`, {
//       method: 'POST',
//       headers: { ...(token ? { 'Authorization': `Bearer ${token}` } : {}) }
//     });
//     if (!res.ok) throw new Error('Failed to resolve escrow');
    
//     setData(prev => prev.map(item => item.requestId === requestId ? { ...item, status: 'completed' } : item));
//   }, []);

//   const raiseDispute = useCallback(async (requestId: string) => {
//     const token = localStorage.getItem("access_token");
//     const res = await fetchWithRetry(`/api/v1/escrow/${requestId}/dispute`, {
//       method: 'POST',
//       headers: { ...(token ? { 'Authorization': `Bearer ${token}` } : {}) }
//     });
//     if (!res.ok) throw new Error('Failed to raise dispute');
//   }, []);

//   const notifyParties = useCallback(async (requestId: string) => {
//     const token = localStorage.getItem("access_token");
//     await fetchWithRetry(`/api/v1/escrow/${requestId}/notify`, {
//       method: 'POST',
//       headers: { ...(token ? { 'Authorization': `Bearer ${token}` } : {}) }
//     });
//   }, []);

//   const createEscrow = useCallback(async (payload: { beneficiary: string; arbiter: string; amount: number }) => {
//     const token = localStorage.getItem("access_token");
//     const res = await fetchWithRetry('/api/v1/escrow/create', {
//       method: 'POST',
//       headers: {
//         'Content-Type': 'application/json',
//         ...(token ? { 'Authorization': `Bearer ${token}` } : {})
//       },
//       body: JSON.stringify(payload)
//     });

//     if (!res.ok) throw new Error(`Failed to create escrow: ${await res.text()}`);

//     const backendResult = await res.json();
    
//     const newEscrow = mapDbToUi({
//       escrowId: backendResult.escrow_id || backendResult.escrowPda,
//       initializer: 'Current User',
//       beneficiary: payload.beneficiary,
//       amount: payload.amount,
//       txSig: backendResult.tx_sig || backendResult.tx,
//       status: 'active',
//       createdAt: new Date().toISOString(),
//       updatedAt: new Date().toISOString()
//     });

//     setData(prev => [newEscrow, ...prev]);
//     return newEscrow;
//   }, []);

//   return { data, loading, error, fetchList, resolveEscrow, raiseDispute, notifyParties, getEscrowDetails, createEscrow };
// }