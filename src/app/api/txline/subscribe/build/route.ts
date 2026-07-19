/**
 * POST /api/txline/subscribe/build
 *
 * Builds an unsigned Solana `subscribe` transaction for the browser to sign.
 * Uses the on-chain TxLINE program to register a free World Cup subscription.
 *
 * Body:  { walletAddress: string, network?: 'devnet' | 'mainnet-beta' }
 * Returns: { transactionBase64: string }
 */
import { NextRequest, NextResponse } from 'next/server';
import * as anchor from '@coral-xyz/anchor';
import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  TOKEN_2022_PROGRAM_ID,
  getAssociatedTokenAddressSync,
} from '@solana/spl-token';
import { Connection, PublicKey, SystemProgram } from '@solana/web3.js';
import devnetIdl from '../../../../../../scripts/idl/txoracle-devnet.json';
import mainnetIdl from '../../../../../../scripts/idl/txoracle-mainnet.json';

const NETWORK_CONFIG = {
  'mainnet-beta': {
    rpcUrl:     'https://api.mainnet-beta.solana.com',
    programId:  new PublicKey('9ExbZjAapQww1vfcisDmrngPinHTEfpjYRWMunJgcKaA'),
    txlMint:    new PublicKey('Zhw9TVKp68a1QrftncMSd6ELXKDtpVMNuMGr1jNwdeL'),
    idl:        mainnetIdl,
    serviceLevel: 12,   // real-time free tier
  },
  devnet: {
    rpcUrl:     'https://api.devnet.solana.com',
    programId:  new PublicKey('6pW64gN1s2uqjHkn1unFeEjAwJkPGHoppGvS715wyP2J'),
    txlMint:    new PublicKey('4Zao8ocPhmMgq7PdsYWyxvqySMGx7xb9cMftPMkEokRG'),
    idl:        devnetIdl,
    serviceLevel: 1,    // devnet free tier
  },
} as const;

export async function POST(req: NextRequest) {
  try {
    const { walletAddress, network = 'devnet' } = await req.json() as {
      walletAddress: string;
      network?: 'devnet' | 'mainnet-beta';
    };

    if (!walletAddress) {
      return NextResponse.json({ error: 'walletAddress required' }, { status: 400 });
    }

    const cfg        = NETWORK_CONFIG[network] ?? NETWORK_CONFIG.devnet;
    const userPubkey = new PublicKey(walletAddress);
    const connection = new Connection(cfg.rpcUrl, 'confirmed');

    // Dummy wallet — only building tx, not signing server-side
    const dummyWallet = {
      publicKey:          userPubkey,
      signTransaction:    async <T>(tx: T) => tx,
      signAllTransactions: async <T>(txs: T[]) => txs,
    };

    const provider = new anchor.AnchorProvider(connection, dummyWallet as anchor.Wallet, {
      commitment: 'confirmed',
    });
    anchor.setProvider(provider);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const program = new anchor.Program(cfg.idl as any, provider);

    const [tokenTreasuryPda] = PublicKey.findProgramAddressSync(
      [Buffer.from('token_treasury_v2')],
      cfg.programId
    );
    const tokenTreasuryVault = getAssociatedTokenAddressSync(
      cfg.txlMint, tokenTreasuryPda, true,
      TOKEN_2022_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID
    );
    const [pricingMatrixPda] = PublicKey.findProgramAddressSync(
      [Buffer.from('pricing_matrix')],
      cfg.programId
    );
    const userTokenAccount = getAssociatedTokenAddressSync(
      cfg.txlMint, userPubkey, false,
      TOKEN_2022_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID
    );

    const DURATION_WEEKS = 4;

    const tx = await program.methods
      .subscribe(cfg.serviceLevel, DURATION_WEEKS)
      .accounts({
        user:                userPubkey,
        pricingMatrix:       pricingMatrixPda,
        tokenMint:           cfg.txlMint,
        userTokenAccount,
        tokenTreasuryVault,
        tokenTreasuryPda,
        tokenProgram:        TOKEN_2022_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        systemProgram:       SystemProgram.programId,
      })
      .transaction();

    const { blockhash } = await connection.getLatestBlockhash('confirmed');
    tx.recentBlockhash = blockhash;
    tx.feePayer        = userPubkey;

    const serialized         = tx.serialize({ requireAllSignatures: false });
    const transactionBase64  = Buffer.from(serialized).toString('base64');

    return NextResponse.json({ transactionBase64 });
  } catch (err) {
    console.error('[/api/txline/subscribe/build]', err);
    return NextResponse.json(
      { error: (err as Error).message || 'Failed to build transaction' },
      { status: 500 }
    );
  }
}
