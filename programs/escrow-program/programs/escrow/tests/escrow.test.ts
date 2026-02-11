import * as anchor from "@project-serum/anchor";
import { Program } from "@project-serum/anchor";
import { Escrow } from "../../../target/types/escrow";
import { Keypair, PublicKey } from "@solana/web3.js";
import { describe, it, expect } from "@jest/globals";

describe("escrow", () => {
  const provider = anchor.AnchorProvider.local();
  anchor.setProvider(provider);

  const program = anchor.workspace.Escrow as Program;

  it("initializes an escrow account", async () => {
    const initializer = provider.wallet as anchor.Wallet;
    const beneficiary = Keypair.generate();
    const arbiter = Keypair.generate();

    const [escrowPda, bump] = await PublicKey.findProgramAddress(
      [
        Buffer.from("escrow"),
        provider.wallet.publicKey.toBytes(),
        beneficiary.publicKey.toBytes(),
      ],
      program.programId
    );

    // create a small account by calling initializeEscrow
    const tx = await program.rpc.initializeEscrow(bump, new anchor.BN(1), {
      accounts: {
        escrowAccount: escrowPda,
        initializer: provider.wallet.publicKey,
        beneficiary: beneficiary.publicKey,
        arbiter: arbiter.publicKey,
        initializerTokenAccount: provider.wallet.publicKey, // placeholder, not used in test
        mint: anchor.web3.PublicKey.default, // placeholder
        systemProgram: anchor.web3.SystemProgram.programId,
        rent: anchor.web3.SYSVAR_RENT_PUBKEY,
        tokenProgram: anchor.utils.token.TOKEN_PROGRAM_ID,
      },
      signers: [], // provider wallet signs through AnchorProvider
    });

    // fetch account and assert values
    const account = await program.account.escrowAccount.fetch(escrowPda);
    console.log("escrow account:", account);
    expect(account.initializer.toBase58()).toEqual(provider.wallet.publicKey.toBase58());
    expect(account.beneficiary.toBase58()).toEqual(beneficiary.publicKey.toBase58());
  });
});
