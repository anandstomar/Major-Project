use anchor_lang::prelude::*;

// declare_id!("6y9kcH8jKj5kBAQCdC1PHRkNmhWKWBLaVYMyLedkvfUn");
declare_id!("Fb7znUeRhH1pHHRd5cNtwTxFqL9AheKvDmU1MR4AZ5tq");

#[program]
pub mod anchor_program {
    use super::*;

    pub fn init_anchor(ctx: Context<InitAnchor>, request_id: String) -> Result<()> {
        let account = &mut ctx.accounts.anchor_account;
        account.request_id = request_id;
        account.submitter = ctx.accounts.submitter.key();
        account.submitted_at = Clock::get()?.unix_timestamp;
        account.merkle_root = [0u8; 32];
        account.events = String::from("[]");
        Ok(())
    }

    pub fn submit_anchor(ctx: Context<SubmitAnchor>, merkle_root: [u8; 32], events_json: String) -> Result<()> {
        let account = &mut ctx.accounts.anchor_account;
        account.merkle_root = merkle_root;
        account.events = events_json;
        account.submitted_at = Clock::get()?.unix_timestamp;

        emit!(AnchorSubmitted {
            request_id: account.request_id.clone(),
            merkle_root,
            submitter: ctx.accounts.submitter.key(),
            submitted_at: account.submitted_at,
        });

        Ok(())
    }
}

#[derive(Accounts)]
#[instruction(request_id: String)]
pub struct InitAnchor<'info> {
    #[account(
        init,
        payer = submitter,
        space = AnchorAccount::space(&request_id),
        seeds = [b"anchor", request_id.as_bytes()],
        bump
    )]
    pub anchor_account: Account<'info, AnchorAccount>,

    #[account(mut)]
    pub submitter: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct SubmitAnchor<'info> {
    #[account(mut,
        seeds = [b"anchor", anchor_account.request_id.as_bytes()],
        bump
    )]
    pub anchor_account: Account<'info, AnchorAccount>,

    #[account(mut)]
    pub submitter: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[account]
pub struct AnchorAccount {
    pub request_id: String,
    pub merkle_root: [u8; 32],
    pub submitter: Pubkey,
    pub submitted_at: i64,
    pub events: String,
}

impl AnchorAccount {
    pub fn space(request_id: &String) -> usize {
        // 8 discriminator + 4(len)+request_id + 32 + 32(pubkey) + 8(i64) + 4(len)+events
        8 + 4 + request_id.len() + 32 + 32 + 8 + 4 + 256
    }
}

#[event]
pub struct AnchorSubmitted {
    pub request_id: String,
    pub merkle_root: [u8; 32],
    pub submitter: Pubkey,
    pub submitted_at: i64,
}
