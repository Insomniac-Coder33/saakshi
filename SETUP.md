# Saakshi: one-time setup

About 25 minutes. Everything is free except Anthropic (about $5).

**Do the steps in this order.** The faucet has a 12-hour cooldown, so it goes first. The Supabase project takes about 2 minutes to create, so start it before Anthropic and do Anthropic while you wait.

## Before you start
- Open your private settings file: press **Win + R**, paste `notepad C:\Users\Pratik\Desktop\Appvengers-Shakti\.env.local` and press **Enter**.
- Paste each value right after its `=`, with no spaces and no quotes. Press **Ctrl + S** after every step.
- Don't change the `RELAYER_` lines; they are your testnet wallet, already filled in.
- **Never paste keys into the chat.** If one slips in by accident, delete that key on the provider's website and create a new one.

---

## Step 1: Free test tokens: DONE (0.01 POL received on 20 Oct)
**Daily routine until 24 Oct:** once a day, open **https://ghostchain.io/faucet/polygon-amoy/**, paste the address below and click the *instant* claim, which gives 0.01 POL. Skip the Telegram button.

The contract is built to be frugal: about 0.003 POL to deploy and under 0.001 POL per seal. Development runs on a free local blockchain, so this trickle is enough. The options below are only a backup.

### Backup options
Our wallet address: `0xeFf094c2860B2aa0f3221AA7f2296C89234189dd`

**About 0.05 to 0.1 POL is enough** for the contract plus 20 to 50 or more seals at today's gas price.

As of 20 Oct 2026, Polygon's own faucet is retired, and QuickNode, Alchemy, GetBlock and Chainstack all refuse wallets that hold no real ETH. Try these instead, in order:

1. **StakePool faucet** (listed in Polygon's own docs): **https://faucet.stakepool.dev.br/amoy**. Paste the address, complete the check, and claim.
2. **GHOST faucet**: **https://ghostchain.io/faucet/polygon-amoy/**. It gives 0.01 POL instantly, or 0.1 POL through its Telegram bot. It's a third-party site, so **only paste the address. Never connect a wallet or sign anything.**
3. **Ask someone.** Any Web3 friend or hackathon group can send test POL in seconds; it has no real value. Message to copy:
   > Hi! I'm building for the SHAKTI hackathon and need a little Polygon Amoy test POL (testnet only, no real value). Could anyone send 0.1 POL to 0xeFf094c2860B2aa0f3221AA7f2296C89234189dd? Thank you!
4. **A MetaMask wallet with at least 0.001 real ETH** (yours or a friend's):
   - Claim at https://www.alchemy.com/faucets/polygon-amoy or https://faucet.quicknode.com/polygon/amoy into *that* wallet.
   - In MetaMask, add the Amoy network via https://chainlist.org (search "Amoy", then **Add to MetaMask**).
   - Click **Send**, paste our address, enter **0.1** POL and confirm.

Tell me "tokens sent" when any of these works. I'll check the balance myself.

---

## Step 2: Supabase (5 min, plus about 2 min of waiting)

**A. Account**
1. Open **https://supabase.com** and click **Start your project**.
2. Click **Continue with GitHub** and authorise Supabase.
3. If asked to create an organisation, use name `Appvengers`, type **Personal**, plan **Free**, then click **Create organization**.

**B. Project**
1. Click **New project** and fill in:
   - **Name:** `saakshi`
   - **Database password:** click **Generate a password**, then **Copy**. Paste it into `SUPABASE_DB_PASSWORD=` and save.
   - **Region:** **South Asia (Mumbai)**. If you only see broad areas, choose Asia-Pacific and then Mumbai.
   - Leave everything else as it is.
2. Click **Create new project**. While it sets up, go and do **Step 3**, then come back here.

**C. Copy the keys** (once the project dashboard has loaded)
1. Click the gear icon (**Project Settings**) at the bottom of the left sidebar, then **API Keys**.
2. Find the **Publishable key** (starts with `sb_publishable_`). Click **Copy** and paste it into `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=`.
3. Under **Secret keys**, click the eye icon on the `default` key, copy it (starts with `sb_secret_`) and paste it into `SUPABASE_SECRET_KEY=`.
   - If you only see **Legacy API keys**, put **anon** on the publishable line and **service_role** on the secret line.
4. In Project Settings, open **Data API** and copy the **Project URL** (it looks like `https://abcdefgh.supabase.co`). Paste it into `NEXT_PUBLIC_SUPABASE_URL=` and save. Also paste this URL in the chat; it isn't secret.

**D. Allow sign-in without email**
1. In the left sidebar, open **Authentication → Sign In / Providers**.
2. Under **User Signups**, switch on **Allow anonymous sign-ins** and click **Save changes**.

This lets a woman use Saakshi without giving an email or phone number.

---

## Step 3: Anthropic API key (5 min, about $5)
1. Open **https://console.anthropic.com**. It may redirect to platform.claude.com, which is the same console.
2. Sign up or log in. This account is separate from any Claude.ai subscription; Pro and Max plans do **not** include API credits.
3. **Buy credits:** **Settings → Billing → Buy credits**, choose **$5** and pay by card.
   - If an Indian card is declined, open your bank app, enable **international / online transactions** for the card, and try again.
   - Choose a one-time purchase, not auto-reload.
4. **Create the key:** **Settings → API keys → Create key**. Choose workspace **Default**, name it `saakshi`, then click **Create**.
5. **Copy it immediately.** It starts with `sk-ant-` and is shown only once. Paste it into `ANTHROPIC_API_KEY=` and save.
6. Optional: under **Settings → Limits**, set a monthly spend limit such as $10.

---

## Step 4: GitHub login (3 min)
Do Steps 4 to 6 in a **separate PowerShell window**: open the Start menu, type `PowerShell` and press Enter.

1. Install the GitHub command-line tool:
   ```
   winget install --id GitHub.cli -e
   ```
   If asked to accept the source agreements, type `Y` and press Enter. Click **Yes** if Windows asks to allow changes.
2. **Close that PowerShell window and open a new one**, so it can find the new tool. Check that it worked with `gh --version`.
3. Run `gh auth login` and answer with the arrow keys and Enter:
   - Where do you use GitHub? → **GitHub.com**
   - Preferred protocol for Git operations? → **HTTPS**
   - Authenticate Git with your GitHub credentials? → **Yes**
   - How would you like to authenticate? → **Login with a web browser**
4. It shows a one-time code like `ABCD-1234`. Copy it and press Enter. In the browser page that opens, paste the code, click **Continue**, then **Authorize github**.
5. PowerShell should now say **Logged in as \<your username\>**. You can check any time with `gh auth status`.

---

## Step 5: Vercel (3 min)
1. Open **https://vercel.com/signup**.
2. Choose **Hobby** (personal projects), enter your name, click **Continue with GitHub** and authorise Vercel.
3. In the same PowerShell window, run:
   ```
   npx vercel login
   ```
   - If it asks `Ok to proceed? (y)`, type `y` and press Enter. It is downloading the Vercel tool.
   - If it shows a link and a code, open the link, confirm the code and approve.
   - If it asks how to log in, choose **Continue with GitHub**.
4. Check that it worked with `npx vercel whoami`. It should print your username.

---

## Step 6: Supabase command-line login (2 min)
1. In the same window, run:
   ```
   npx supabase login
   ```
   Type `y` if it asks `Ok to proceed?`.
2. Press **Enter** to open the browser, then approve.
3. If the terminal asks for a verification code, copy it from the browser page and paste it into the terminal.
4. Check that it worked with `npx supabase projects list`. You should see `saakshi`.

---

## Step 7 (optional): Etherscan key (3 min)
This lets judges read the smart contract's source code on the Polygon explorer.
1. Open **https://etherscan.io/register**, fill in the form, then confirm the link in your email and log in.
2. Click your username (top right), then **API Dashboard → + Add**. Name it `saakshi` and create it.
3. Copy the key, paste it into `ETHERSCAN_API_KEY=` and save. One Etherscan key also works for Polygon.

---

## When you're done, reply in the chat with
```
GitHub username:
Supabase project URL: https://....supabase.co
Faucet: done / failed (error text)
Env file: saved
Logins: gh, vercel, supabase done
```
