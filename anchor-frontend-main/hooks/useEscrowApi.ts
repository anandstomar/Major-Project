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

    const beneficiaryPubkey = new PublicKey(payload.beneficiary);
    const arbiterPubkey = new PublicKey(payload.arbiter);
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
    
    console.log("Transaction Sent! Confirming on Solana...");
    await connection.confirmTransaction({ signature, ...latestBlockhash });

    console.log("Success! Transaction Hash:", signature);

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

  // 👇 THE MAGIC HAPPENS HERE: Pure Frontend Resolving
  const resolveEscrow = useCallback(async (requestId: string) => {
    if (!wallet.publicKey || !wallet.signTransaction) {
      throw new Error("Please connect your Phantom wallet first!");
    }

    // 1. Initialize Anchor Provider
    const provider = new AnchorProvider(connection, wallet as any, { commitment: 'confirmed' });
    const program = new Program(idl as Idl, provider);
    const escrowPda = new PublicKey(requestId);

    console.log("Fetching Escrow State...");
    
    // 2. Read the on-chain data to find the exact Beneficiary
    const escrowState = await (program.account as any).escrowAccount.fetch(escrowPda);
    const beneficiaryPubkey = escrowState.beneficiary as PublicKey;

    console.log("Locating Escrow Token Accounts...");
    
    // 3. Dynamically find the exact Mint and Token Account owned by the Escrow PDA
    const tokenAccounts = await connection.getParsedTokenAccountsByOwner(escrowPda, { programId: TOKEN_PROGRAM_ID });
    if (tokenAccounts.value.length === 0) {
        throw new Error("No tokens found in this Escrow! It may have already been resolved.");
    }

    const escrowTokenAccount = tokenAccounts.value[0].pubkey;
    const mintPubkey = new PublicKey(tokenAccounts.value[0].account.data.parsed.info.mint);

    // 4. Derive the Beneficiary's Token Account (where the funds will go)
    const beneficiaryTokenAccount = getAssociatedTokenAddressSync(mintPubkey, beneficiaryPubkey, true);

    const tx = new Transaction();

    // 5. Check if the Beneficiary already has a token account for this Mint. If not, build one!
    const beneficiaryAtaInfo = await connection.getAccountInfo(beneficiaryTokenAccount);
    if (!beneficiaryAtaInfo) {
      tx.add(
        createAssociatedTokenAccountInstruction(
          wallet.publicKey, // Payer (Arbiter pays the tiny rent fee)
          beneficiaryTokenAccount,
          beneficiaryPubkey,
          mintPubkey
        )
      );
    }

    console.log("Building Release Instruction...");

    // 6. Append the Anchor Smart Contract Release Instruction
    const releaseIx = await (program.methods as any)
      .release()
      .accounts({
        escrowAccount: escrowPda,
        escrowPda: escrowPda,
        escrowTokenAccount: escrowTokenAccount,
        beneficiaryTokenAccount: beneficiaryTokenAccount,
        tokenProgram: TOKEN_PROGRAM_ID,
        arbiter: wallet.publicKey, // Phantom is the Arbiter!
      })
      .instruction();

    tx.add(releaseIx);

    // 7. Prepare and send to Phantom
    const latestBlockhash = await connection.getLatestBlockhash();
    tx.recentBlockhash = latestBlockhash.blockhash;
    tx.feePayer = wallet.publicKey;

    console.log("Waiting for Phantom Approval...");
    
    // 🚀 TRIGGER PHANTOM POPUP!
    const signature = await wallet.sendTransaction(tx, connection);

    console.log("Transaction Sent! Confirming on Solana...");
    await connection.confirmTransaction({ signature, ...latestBlockhash });

    console.log("Successfully resolved via Phantom! Transaction Hash:", signature);

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