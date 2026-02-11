use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Transfer, Mint};

// declare_id!("BMyEggdJbUqjTm3Kg8XR2JxSh57dTNTjiHm3qzY6xi3p");
declare_id!("9ttJXA6WENpW6ipHvnvYeix9mbbMnDYQcH42DWxx5nRo");

#[program]
pub mod escrow {
    use super::*;

    pub fn initialize_escrow(
        ctx: Context<InitializeEscrow>,
        bump: u8,
        amount: u64,
    ) -> Result<()> {
        let escrow_account = &mut ctx.accounts.escrow_account;
        escrow_account.initializer = ctx.accounts.initializer.key();
        escrow_account.beneficiary = ctx.accounts.beneficiary.key();
        escrow_account.arbiter = ctx.accounts.arbiter.key();
        escrow_account.amount = amount;
        escrow_account.bump = bump;
        escrow_account.is_released = false;
        Ok(())
    }

    pub fn release(ctx: Context<Release>) -> Result<()> {
        let escrow_account = &mut ctx.accounts.escrow_account;
        require!(!escrow_account.is_released, EscrowError::AlreadyReleased);

        let seeds: &[&[u8]] = &[
            b"escrow",
            escrow_account.initializer.as_ref(),
            escrow_account.beneficiary.as_ref(),
            &[escrow_account.bump],
        ];

        let signer = &[&seeds[..]];

        let cpi_accounts = Transfer {
            from: ctx.accounts.escrow_token_account.to_account_info(),
            to: ctx.accounts.beneficiary_token_account.to_account_info(),
            authority: ctx.accounts.escrow_pda.to_account_info(),
        };

        let cpi_program = ctx.accounts.token_program.to_account_info();

        token::transfer(CpiContext::new_with_signer(cpi_program, cpi_accounts, signer), escrow_account.amount)?;

        escrow_account.is_released = true;
        Ok(())
    }

    pub fn cancel(ctx: Context<Cancel>) -> Result<()> {
        let escrow_account = &mut ctx.accounts.escrow_account;
        require!(!escrow_account.is_released, EscrowError::AlreadyReleased);

        let seeds: &[&[u8]] = &[
            b"escrow",
            escrow_account.initializer.as_ref(),
            escrow_account.beneficiary.as_ref(),
            &[escrow_account.bump],
        ];

        let signer = &[&seeds[..]];

        let cpi_accounts = Transfer {
            from: ctx.accounts.escrow_token_account.to_account_info(),
            to: ctx.accounts.initializer_token_account.to_account_info(),
            authority: ctx.accounts.escrow_pda.to_account_info(),
        };

        let cpi_program = ctx.accounts.token_program.to_account_info();

        token::transfer(CpiContext::new_with_signer(cpi_program, cpi_accounts, signer), escrow_account.amount)?;

        escrow_account.is_released = true;
        Ok(())
    }
}

#[account]
pub struct EscrowAccount {
    pub initializer: Pubkey,
    pub beneficiary: Pubkey,
    pub arbiter: Pubkey,
    pub amount: u64,
    pub bump: u8,
    pub is_released: bool,
}

#[derive(Accounts)]
#[instruction(escrow_bump: u8)]
pub struct InitializeEscrow<'info> {
    #[account(init, payer = initializer, space = 8 + 32*3 + 8 + 1 + 1, seeds = [
        b"escrow",
        initializer.key().as_ref(),
        beneficiary.key().as_ref()
    ], bump)]
    pub escrow_account: Account<'info, EscrowAccount>,

    #[account(mut)]
    pub initializer: Signer<'info>,

    /// CHECK: This is not unsafe because we only use it as a key for the PDA and store it.
    pub beneficiary: UncheckedAccount<'info>,

    /// CHECK: This is not unsafe because we only store it to verify the signer later.
    pub arbiter: UncheckedAccount<'info>,

    #[account(mut)]
    pub initializer_token_account: Account<'info, TokenAccount>,

    pub mint: Account<'info, Mint>,

    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct Release<'info> {
    #[account(mut, has_one = arbiter)]
    pub escrow_account: Account<'info, EscrowAccount>,

    /// CHECK: PDA authority
    pub escrow_pda: UncheckedAccount<'info>,

    #[account(mut)]
    pub escrow_token_account: Account<'info, TokenAccount>,

    #[account(mut)]
    pub beneficiary_token_account: Account<'info, TokenAccount>,

    pub token_program: Program<'info, Token>,

    pub arbiter: Signer<'info>,
}

#[derive(Accounts)]
pub struct Cancel<'info> {
    #[account(mut, has_one = initializer)]
    pub escrow_account: Account<'info, EscrowAccount>,

    /// CHECK: PDA authority
    pub escrow_pda: UncheckedAccount<'info>,

    #[account(mut)]
    pub escrow_token_account: Account<'info, TokenAccount>,

    #[account(mut)]
    pub initializer_token_account: Account<'info, TokenAccount>,

    pub token_program: Program<'info, Token>,

    pub initializer: Signer<'info>,
}

#[error_code]
pub enum EscrowError {
    #[msg("Escrow already released/cancelled")]
    AlreadyReleased,
}
