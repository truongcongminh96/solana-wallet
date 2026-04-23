import { address, createSolanaRpc, devnet } from "@solana/kit";
import { getWallets } from "@wallet-standard/app";

const LAMPORTS_PER_SOL = 1_000_000_000;
const DEVNET_RPC_URL = "https://api.devnet.solana.com";
const DEVNET_CHAIN_PREFIX = "solana:";

const rpc = createSolanaRpc(devnet(DEVNET_RPC_URL));

const elements = {
  walletList: document.getElementById("wallet-list"),
  connected: document.getElementById("connected"),
  status: document.getElementById("status"),
  error: document.getElementById("error"),
};

const state = {
  wallets: [],
  connectedWallet: null,
  connectedAccount: null,
  isBusy: false,
  balanceInLamports: null,
  lastUpdatedAt: null,
};

function isSolanaWallet(wallet) {
  return wallet.chains?.some((chain) => chain.startsWith(DEVNET_CHAIN_PREFIX));
}

function normalizeError(error) {
  if (!error) return "Unknown error.";
  if (typeof error === "string") return error;
  if (error instanceof Error && error.message) return error.message;
  return "Something went wrong.";
}

function shortenAddress(value, left = 6, right = 6) {
  if (!value || value.length <= left + right + 1) return value;
  return `${value.slice(0, left)}…${value.slice(-right)}`;
}

function formatSolBalance(lamports) {
  return (Number(lamports) / LAMPORTS_PER_SOL).toFixed(9);
}

function formatTimestamp(date) {
  if (!date) return "—";
  return new Intl.DateTimeFormat(undefined, {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(date);
}

function setStatus(message) {
  elements.status.textContent = message;
  elements.status.classList.remove("hidden");
}

function clearStatus() {
  elements.status.textContent = "";
  elements.status.classList.add("hidden");
}

function setError(message) {
  if (!message) {
    elements.error.textContent = "";
    elements.error.classList.add("hidden");
    return;
  }

  elements.error.textContent = message;
  elements.error.classList.remove("hidden");
}

function getWalletIconMarkup(wallet) {
  if (!wallet.icon) {
    return '<div class="wallet-btn__icon" aria-hidden="true"></div>';
  }

  return `
    <div class="wallet-btn__icon" aria-hidden="true">
      <img src="${wallet.icon}" alt="" />
    </div>
  `;
}

function getChainsSummary(wallet) {
  const chains = wallet.chains ?? [];
  const solanaChains = chains.filter((chain) => chain.startsWith(DEVNET_CHAIN_PREFIX));
  if (solanaChains.length === 0) return "Solana wallet";
  return `${solanaChains.length} Solana chain${solanaChains.length > 1 ? "s" : ""} detected`;
}

function renderWalletList() {
  const solanaWallets = state.wallets.filter(isSolanaWallet);

  if (state.connectedWallet && state.connectedAccount) {
    elements.walletList.classList.add("hidden");
    renderConnectedCard();
    return;
  }

  elements.connected.classList.add("hidden");
  elements.walletList.classList.remove("hidden");

  if (solanaWallets.length === 0) {
    elements.walletList.innerHTML = `
      <div class="empty-state">
        No Solana wallets found in this browser.<br />
        Install <a href="https://phantom.app" target="_blank" rel="noreferrer">Phantom</a>
        or another Solana wallet extension, then refresh the page.
      </div>
    `;
    setStatus("No wallets detected yet.");
    return;
  }

  setStatus(`Found ${solanaWallets.length} wallet${solanaWallets.length > 1 ? "s" : ""}. Choose one to connect.`);

  elements.walletList.innerHTML = solanaWallets
    .map(
      (wallet, index) => `
        <button class="wallet-btn" data-wallet-index="${index}" ${state.isBusy ? "disabled" : ""}>
          <span class="wallet-btn__left">
            ${getWalletIconMarkup(wallet)}
            <span>
              <span class="wallet-btn__name">${wallet.name}</span>
              <span class="wallet-btn__chains">${getChainsSummary(wallet)}</span>
            </span>
          </span>
          <span class="wallet-btn__arrow">→</span>
        </button>
      `,
    )
    .join("");

  const buttons = elements.walletList.querySelectorAll("[data-wallet-index]");
  buttons.forEach((button) => {
    button.addEventListener("click", async () => {
      const index = Number(button.getAttribute("data-wallet-index"));
      const wallet = solanaWallets[index];
      if (wallet) {
        await connectWallet(wallet);
      }
    });
  });
}

function renderConnectedCard() {
  const wallet = state.connectedWallet;
  const account = state.connectedAccount;

  if (!wallet || !account) {
    elements.connected.innerHTML = "";
    elements.connected.classList.add("hidden");
    return;
  }

  const fullAddress = account.address;
  const balanceValue =
    state.balanceInLamports == null
      ? `<div class="stat__value stat__value--compact">Loading…</div>`
      : `
        <div class="stat__value stat__value--balance">
          <span class="stat__number">${formatSolBalance(state.balanceInLamports)}</span>
          <span class="stat__unit">SOL</span>
        </div>
      `;

  elements.connected.innerHTML = `
    <div class="connected-card">
      <div class="connected-head">
        <div class="connected-wallet">
          <div class="connected-wallet__icon">${wallet.icon ? `<img src="${wallet.icon}" alt="" style="width:100%;height:100%;object-fit:cover;display:block;" />` : ""}</div>
          <div>
            <div class="connected-wallet__name">${wallet.name}</div>
            <div class="connected-wallet__hint">Permission granted by the wallet extension</div>
          </div>
        </div>
        <div class="pill">Connected</div>
      </div>

      <div class="address-card">
        <div class="address-card__label">Public address</div>
        <div class="address-card__value">${fullAddress}</div>
        <div class="helper">Short view: ${shortenAddress(fullAddress)}</div>
      </div>

      <div class="stats">
        <div class="stat">
          <div class="stat__label">Devnet balance</div>
          ${balanceValue}
        </div>
        <div class="stat">
          <div class="stat__label">Last refreshed</div>
          <div class="stat__value stat__value--compact">${formatTimestamp(state.lastUpdatedAt)}</div>
        </div>
      </div>

      <div class="actions">
        <button class="primary-btn" id="refreshBalanceBtn">Refresh balance</button>
        <button class="ghost-btn" id="copyAddressBtn">Copy address</button>
        <button class="danger-btn" id="disconnectBtn">Disconnect</button>
      </div>
    </div>
  `;

  elements.connected.classList.remove("hidden");

  document.getElementById("refreshBalanceBtn")?.addEventListener("click", refreshBalance);
  document.getElementById("copyAddressBtn")?.addEventListener("click", copyAddress);
  document.getElementById("disconnectBtn")?.addEventListener("click", disconnectWallet);
}

async function connectWallet(wallet) {
  const connectFeature = wallet.features["standard:connect"];
  if (!connectFeature) {
    setError("This wallet does not expose the standard connect feature.");
    return;
  }

  state.isBusy = true;
  setError("");
  setStatus(`Requesting connection from ${wallet.name}…`);
  renderWalletList();

  try {
    const { accounts } = await connectFeature.connect();

    if (!accounts?.length) {
      throw new Error("No account was returned. The request may have been rejected.");
    }

    const account = accounts[0];
    state.connectedWallet = wallet;
    state.connectedAccount = {
      ...account,
      address: address(account.address),
    };
    state.balanceInLamports = null;
    state.lastUpdatedAt = null;

    clearStatus();
    renderWalletList();
    await refreshBalance();
  } catch (error) {
    state.connectedWallet = null;
    state.connectedAccount = null;
    state.balanceInLamports = null;
    state.lastUpdatedAt = null;
    setError(`Connection failed: ${normalizeError(error)}`);
    setStatus("Choose a wallet to try again.");
    renderWalletList();
  } finally {
    state.isBusy = false;
    renderWalletList();
  }
}

async function refreshBalance() {
  if (!state.connectedAccount) return;

  setError("");
  setStatus("Fetching devnet balance…");

  try {
    const { value } = await rpc.getBalance(state.connectedAccount.address).send();
    state.balanceInLamports = value;
    state.lastUpdatedAt = new Date();
    clearStatus();
    renderConnectedCard();
  } catch (error) {
    setError(`Could not load balance: ${normalizeError(error)}`);
    setStatus("The wallet is connected, but the balance refresh failed.");
  }
}

async function copyAddress() {
  if (!state.connectedAccount?.address) return;

  try {
    await navigator.clipboard.writeText(state.connectedAccount.address);
    setError("");
    setStatus("Address copied to clipboard.");
  } catch {
    setError("Clipboard access failed. You can still copy the address manually.");
  }
}

async function disconnectWallet() {
  if (!state.connectedWallet) return;

  const disconnectFeature = state.connectedWallet.features["standard:disconnect"];

  try {
    if (disconnectFeature) {
      await disconnectFeature.disconnect();
    }
  } catch (error) {
    setError(`Disconnect reported an issue: ${normalizeError(error)}`);
  } finally {
    state.connectedWallet = null;
    state.connectedAccount = null;
    state.balanceInLamports = null;
    state.lastUpdatedAt = null;
    elements.connected.innerHTML = "";
    elements.connected.classList.add("hidden");
    setStatus("Disconnected. Choose a wallet to reconnect.");
    renderWalletList();
  }
}

function syncWalletRegistry(walletRegistry) {
  state.wallets = walletRegistry.get().filter(isSolanaWallet);
  renderWalletList();
}

function init() {
  const walletRegistry = getWallets();
  syncWalletRegistry(walletRegistry);

  walletRegistry.on("register", () => {
    syncWalletRegistry(walletRegistry);
    if (!state.connectedWallet) {
      setStatus(`Wallet list updated. ${state.wallets.length} available.`);
    }
  });

  walletRegistry.on("unregister", () => {
    syncWalletRegistry(walletRegistry);
    if (!state.connectedWallet) {
      setStatus(`Wallet list updated. ${state.wallets.length} available.`);
    }
  });
}

init();
