use anchor_lang::{
    prelude::Pubkey, solana_program::system_program, AccountDeserialize, InstructionData,
    ToAccountMetas,
};
use litesvm::LiteSVM;
use solana_instruction::Instruction;
use solana_keypair::Keypair;
use solana_signer::Signer;
use solana_transaction::Transaction;

fn setup_svm_with_program() -> (LiteSVM, Pubkey) {
    let mut svm = LiteSVM::new();
    let program_id = counter::ID;
    let so_path = concat!(
        env!("CARGO_MANIFEST_DIR"),
        "/../../target/deploy/counter.so"
    );
    svm.add_program_from_file(program_id, so_path).unwrap();
    (svm, program_id)
}

fn config_pda(program_id: &Pubkey) -> (Pubkey, u8) {
    Pubkey::find_program_address(&[b"config"], program_id)
}

fn counter_pda(program_id: &Pubkey, user: &Pubkey) -> (Pubkey, u8) {
    Pubkey::find_program_address(&[b"counter", user.as_ref()], program_id)
}

fn build_init_config_tx(svm: &LiteSVM, program_id: Pubkey, admin: &Keypair) -> Transaction {
    let (config, _) = config_pda(&program_id);
    let ix = Instruction {
        program_id,
        accounts: counter::accounts::InitConfig {
            config,
            admin: admin.pubkey(),
            system_program: system_program::ID,
        }
        .to_account_metas(None),
        data: counter::instruction::InitConfig {}.data(),
    };
    Transaction::new_signed_with_payer(
        &[ix],
        Some(&admin.pubkey()),
        &[admin],
        svm.latest_blockhash(),
    )
}

fn build_set_paused_tx(
    svm: &LiteSVM,
    program_id: Pubkey,
    admin: &Keypair,
    paused: bool,
) -> Transaction {
    let (config, _) = config_pda(&program_id);
    let ix = Instruction {
        program_id,
        accounts: counter::accounts::SetPaused {
            config,
            admin: admin.pubkey(),
        }
        .to_account_metas(None),
        data: counter::instruction::SetPaused { paused }.data(),
    };
    Transaction::new_signed_with_payer(
        &[ix],
        Some(&admin.pubkey()),
        &[admin],
        svm.latest_blockhash(),
    )
}

fn build_init_counter_tx(svm: &LiteSVM, program_id: Pubkey, user: &Keypair) -> Transaction {
    let (config, _) = config_pda(&program_id);
    let (counter, _) = counter_pda(&program_id, &user.pubkey());
    let ix = Instruction {
        program_id,
        accounts: counter::accounts::InitCounter {
            config,
            counter,
            user: user.pubkey(),
            system_program: system_program::ID,
        }
        .to_account_metas(None),
        data: counter::instruction::InitCounter {}.data(),
    };
    Transaction::new_signed_with_payer(&[ix], Some(&user.pubkey()), &[user], svm.latest_blockhash())
}

fn build_increment_tx(svm: &LiteSVM, program_id: Pubkey, user: &Keypair) -> Transaction {
    let (config, _) = config_pda(&program_id);
    let (counter, _) = counter_pda(&program_id, &user.pubkey());
    let ix = Instruction {
        program_id,
        accounts: counter::accounts::Increment {
            config,
            counter,
            user: user.pubkey(),
        }
        .to_account_metas(None),
        data: counter::instruction::Increment {}.data(),
    };
    Transaction::new_signed_with_payer(&[ix], Some(&user.pubkey()), &[user], svm.latest_blockhash())
}

fn build_close_counter_tx(svm: &LiteSVM, program_id: Pubkey, user: &Keypair) -> Transaction {
    let (counter, _) = counter_pda(&program_id, &user.pubkey());
    let ix = Instruction {
        program_id,
        accounts: counter::accounts::CloseCounter {
            counter,
            user: user.pubkey(),
        }
        .to_account_metas(None),
        data: counter::instruction::CloseCounter {}.data(),
    };
    Transaction::new_signed_with_payer(&[ix], Some(&user.pubkey()), &[user], svm.latest_blockhash())
}

fn lamports(svm: &LiteSVM, address: &Pubkey) -> u64 {
    svm.get_account(address)
        .map(|account| account.lamports)
        .unwrap_or(0)
}

fn read_config(svm: &LiteSVM, config: &Pubkey) -> counter::Config {
    let account = svm.get_account(config).unwrap();
    counter::Config::try_deserialize(&mut account.data.as_slice()).unwrap()
}

fn read_counter(svm: &LiteSVM, counter: &Pubkey) -> counter::Counter {
    let account = svm.get_account(counter).unwrap();
    counter::Counter::try_deserialize(&mut account.data.as_slice()).unwrap()
}

#[test]
fn initializes_config_and_counter_then_increments() {
    let (mut svm, program_id) = setup_svm_with_program();

    let admin = Keypair::new();
    svm.airdrop(&admin.pubkey(), 1_000_000_000).unwrap();

    let (config_pda, config_bump) = config_pda(&program_id);
    let (counter_pda, counter_bump) = counter_pda(&program_id, &admin.pubkey());

    let tx = build_init_config_tx(&svm, program_id, &admin);
    svm.send_transaction(tx)
        .expect("init_config should succeed");
    println!("init_config: ok");

    let tx = build_init_counter_tx(&svm, program_id, &admin);
    svm.send_transaction(tx)
        .expect("init_counter should succeed");
    println!("init_counter: ok");

    let tx = build_increment_tx(&svm, program_id, &admin);
    svm.send_transaction(tx).expect("increment should succeed");
    println!("increment: ok");

    let config = read_config(&svm, &config_pda);
    let counter = read_counter(&svm, &counter_pda);

    assert_eq!(config.admin, admin.pubkey());
    assert!(!config.paused);
    assert_eq!(config.total_counters, 1);
    assert_eq!(config.bump, config_bump);
    assert_eq!(counter.user, admin.pubkey());
    assert_eq!(counter.count, 1);
    assert_eq!(counter.bump, counter_bump);
}

#[test]
fn refuses_to_increment_when_paused() {
    let (mut svm, program_id) = setup_svm_with_program();

    let admin = Keypair::new();
    svm.airdrop(&admin.pubkey(), 1_000_000_000).unwrap();

    let tx = build_init_config_tx(&svm, program_id, &admin);
    svm.send_transaction(tx)
        .expect("init_config should succeed");
    let tx = build_init_counter_tx(&svm, program_id, &admin);
    svm.send_transaction(tx)
        .expect("init_counter should succeed");

    let tx = build_set_paused_tx(&svm, program_id, &admin, true);
    svm.send_transaction(tx)
        .expect("set_paused(true) should succeed");
    println!("set_paused(true): ok");

    let tx = build_increment_tx(&svm, program_id, &admin);
    let result = svm.send_transaction(tx);
    println!("paused increment result: {result:?}");
    assert!(
        result.is_err(),
        "increment should fail while the config is paused"
    );

    let tx = build_set_paused_tx(&svm, program_id, &admin, false);
    svm.send_transaction(tx)
        .expect("set_paused(false) should succeed");
    println!("set_paused(false): ok");
}

#[test]
fn closes_a_counter_and_refunds_the_rent() {
    let (mut svm, program_id) = setup_svm_with_program();

    let user = Keypair::new();
    svm.airdrop(&user.pubkey(), 1_000_000_000).unwrap();

    let tx = build_init_config_tx(&svm, program_id, &user);
    svm.send_transaction(tx)
        .expect("init_config should succeed");
    let tx = build_init_counter_tx(&svm, program_id, &user);
    svm.send_transaction(tx)
        .expect("init_counter should succeed");

    let (counter, _) = counter_pda(&program_id, &user.pubkey());
    let rent_lamports = lamports(&svm, &counter);
    let balance_before = lamports(&svm, &user.pubkey());
    assert!(rent_lamports > 0);

    let tx = build_close_counter_tx(&svm, program_id, &user);
    let metadata = svm
        .send_transaction(tx)
        .expect("close_counter should succeed");

    let balance_after = lamports(&svm, &user.pubkey());
    let net_wallet_change = balance_after as i64 - balance_before as i64;
    let expected_change = rent_lamports as i64 - metadata.fee as i64;

    assert!(
        svm.get_account(&counter).is_none(),
        "counter account should be gone after close"
    );
    assert_eq!(net_wallet_change, expected_change);

    println!("close_counter: ok");
    println!("rent refunded (lamports): {rent_lamports}");
    println!("net wallet change (lamports): {net_wallet_change}");
}
