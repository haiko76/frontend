BEGIN;

CREATE TABLE block(
    number INTEGER PRIMARY KEY,
    hash VARCHAR(66) NOT NULL,
    timestamp TIMESTAMPTZ NOT NULL
);

CREATE TABLE transaction(
    block_number INTEGER NOT NULL,
    hash VARCHAR(66) PRIMARY KEY,
    label VARCHAR(50),
    "from" VARCHAR(42) NOT NULL,
    "to" VARCHAR(42),
    gas_price DECIMAL NOT NULL,
    gas_used DECIMAL NOT NULL,
    index INT NOT NULL,
    timestamp TIMESTAMPTZ NOT NULL
);

CREATE TABLE arbitrage(
    transaction_hash VARCHAR(66) PRIMARY KEY,
    block_number INTEGER NOT NULL,
    arbitrager VARCHAR(42) NOT NULL,
    protocols VARCHAR(255)[],
    profit_raw JSON NOT NULL,
    cost_in_usd DECIMAL NOT NULL,
    profit_amount_in_usd DECIMAL NOT NULL,
    flash_loan_asset VARCHAR(42),
    flash_loan_amount DECIMAL,
    flash_loan_in_usd DECIMAL
);

CREATE TABLE liquidation(
    transaction_hash VARCHAR(66) PRIMARY KEY,
    block_number INTEGER NOT NULL,
    liquidator VARCHAR(42),
    cost_in_usd DECIMAL NOT NULL,
    profit_amount_in_usd DECIMAL NOT NULL,
    revenue_in_usd DECIMAL NOT NULL,
    protocols VARCHAR(255)[] NOT NULL,
    flash_loan_asset VARCHAR(42),
    flash_loan_amount DECIMAL,
    flash_loan_in_usd DECIMAL
);

CREATE INDEX idx_liquidation_hash ON liquidation(transaction_hash);

CREATE TABLE repayment_event(
    transaction_hash VARCHAR(66) NOT NULL,
    block_number INTEGER NOT NULL,
    payer VARCHAR(42) NOT NULL,
    borrower VARCHAR(42) NOT NULL,
    asset_in_debt VARCHAR(42) NOT NULL,
    debt_to_cover DECIMAL NOT NULL,
    liquidated_amount DECIMAL NOT NULL,
    asset_liquidated VARCHAR(42) NOT NULL,
    repayment_amount_in_usd DECIMAL NOT NULL,
    liquidated_amount_in_usd DECIMAL NOT NULL,
    seizure_event_log_index INTEGER NOT NULL,
    repayment_event_log_index INTEGER NOT NULL,

    UNIQUE(transaction_hash, seizure_event_log_index, repayment_event_log_index)
);


CREATE TABLE sandwich(
    transaction_hash VARCHAR(66) PRIMARY KEY,
    block_number INTEGER NOT NULL,
    sandwich_id VARCHAR(66) NOT NULL,
    transaction_log_index INT NOT NULL,
    type VARCHAR(50) NOT NULL, -- in 'frontrun' or 'backrun' or 'victim'
    sandwicher VARCHAR(42) NOT NULL,
    victim VARCHAR(42),
    profit_raw JSON NOT NULL,
    profit_amount_in_usd DECIMAL NOT NULL,
    cost_in_usd DECIMAL NOT NULL,
    protocols VARCHAR(255)[] NOT NULL
);

CREATE INDEX idx_sandwich_id ON sandwich(sandwich_id);

CREATE TABLE transfer(
    event_log_index INT NOT NULL,
    block_number INTEGER NOT NULL,
    transaction_hash VARCHAR(66) NOT NULL,
    asset_id VARCHAR(42) NOT NULL,
    "from" VARCHAR(42) NOT NULL,
    "to" VARCHAR(42),
    amount DECIMAL,
    PRIMARY KEY(block_number, transaction_hash, event_log_index)
);

CREATE TABLE swap(
    event_log_index INT NOT NULL,
    block_number INTEGER NOT NULL,
    transaction_hash VARCHAR(66) NOT NULL,
    asset_in VARCHAR(42) NOT NULL,
    asset_out VARCHAR(42) NOT NULL,
    "from" VARCHAR(42) NOT NULL,
    "to" VARCHAR(42),
    amount_out DECIMAL NOT NULL, 
    amount_in DECIMAL NOT NULL,
    protocol VARCHAR(100), 
    metadata JSON, 
    PRIMARY KEY(block_number, transaction_hash, event_log_index)
);

CREATE TABLE token(
    address VARCHAR(42) PRIMARY KEY,
    symbol VARCHAR(42),
    decimals INT NOT NULL,
    logo VARCHAR(255)
);

CREATE TABLE erc20_historical_price(
    token_address  VARCHAR(42),
    currency CHAR(3) NOT NULL,
    price DECIMAL NOT NULL,
    to_block INTEGER NOT NULL,
    timestamp TIMESTAMPTZ,
    PRIMARY KEY(token_address, currency, to_block)
);

CREATE TABLE pool(
    address VARCHAR(42) PRIMARY KEY,
    assets VARCHAR(42)[],
    factory_address VARCHAR(42) NOT NULL,
    protocol VARCHAR(100) NOT NULL
);

CREATE TABLE whitelist_address(
    id BIGSERIAL PRIMARY KEY,
    address VARCHAR(42) NOT NULL,
    name VARCHAR(100) NOT NULL
);

CREATE SCHEMA mev_inspect;
ALTER TABLE "block" SET SCHEMA mev_inspect;
ALTER TABLE "transaction" SET SCHEMA mev_inspect;
ALTER TABLE arbitrage SET SCHEMA mev_inspect;
ALTER TABLE token SET SCHEMA mev_inspect;
ALTER TABLE erc20_historical_price SET SCHEMA mev_inspect;
ALTER TABLE liquidation SET SCHEMA mev_inspect;
ALTER TABLE sandwich SET SCHEMA mev_inspect;
ALTER TABLE "transfer" SET SCHEMA mev_inspect;
ALTER TABLE swap SET SCHEMA mev_inspect;
ALTER TABLE pool SET SCHEMA mev_inspect;
ALTER TABLE repayment_event SET SCHEMA mev_inspect;
GRANT ALL PRIVILEGES ON SCHEMA mev_inspect TO mev_inspect;
GRANT USAGE ON SCHEMA mev_inspect TO readonly;
GRANT SELECT ON ALL TABLES IN SCHEMA mev_inspect TO readonly;

COMMIT;