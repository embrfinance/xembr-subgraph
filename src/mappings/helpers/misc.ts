import { Address, BigDecimal, BigInt, ethereum, log } from '@graphprotocol/graph-ts';
import {
  XEmbr,
  XEmbrSnapshot,
  UserSnapshot,
  TokenSnapshot,
  UserReward,
  RewardToken,
  User,
} from '../../types/schema';
import { ERC20 } from '../../types/xEmbrToken/ERC20';
import { Transfer } from '../../types/xEmbrToken/xEmbrToken';
import { ONE_BD, ZERO, ZERO_BD, XEMBR_ADDRESS, CooldownEvent, EMBR_ADDRESS, REDEMPTION_INDEX } from './constants';
//import { getPoolAddress } from './pools';

const DAY = 24 * 60 * 60;

export function getTokenDecimals(tokenAddress: Address): i32 {
  let token = ERC20.bind(tokenAddress);
  let result = token.try_decimals();

  return result.reverted ? 0 : result.value;
}

export function tokenToDecimal(amount: BigInt, decimals: i32): BigDecimal {
  let scale = BigInt.fromI32(10)
    .pow(decimals as u8)
    .toBigDecimal();
  return amount.toBigDecimal().div(scale);
}

export function scaleDown(num: BigInt, decimals: i32): BigDecimal {
  return num.divDecimal(BigInt.fromI32(10).pow(u8(decimals)).toBigDecimal());
}

export function saveCooldownToSnapshots(userAddress: Address, timestamp: i32, amount: BigDecimal, cooldownEvent: CooldownEvent, event: ethereum.Event): void {
    let dayTimestamp = timestamp - (timestamp % DAY); // Todays timestamp

    let xEmbrSnapshot = getXEmbrSnapshot(event)
    let userSnapshot = getUserSnapshot(userAddress, event)

    switch (cooldownEvent) {
        case CooldownEvent.COOLDOWN:
            xEmbrSnapshot.totalCooling = xEmbrSnapshot.totalCooling.plus(amount)
            xEmbrSnapshot.totalStaking = xEmbrSnapshot.totalStaking.minus(amount)
            userSnapshot.cooling = userSnapshot.cooling.plus(amount)
            userSnapshot.staking = userSnapshot.staking.minus(amount)
            break;
        case CooldownEvent.EXIT:
            xEmbrSnapshot.totalCooling = xEmbrSnapshot.totalCooling.minus(amount)
            xEmbrSnapshot.totalStaking = xEmbrSnapshot.totalStaking.plus(amount)
            userSnapshot.cooling = userSnapshot.cooling.minus(amount)
            userSnapshot.staking = userSnapshot.staking.plus(amount)
            break;
        case CooldownEvent.WITHDRAW:
            xEmbrSnapshot.totalCooling = xEmbrSnapshot.totalCooling.minus(amount)
            userSnapshot.cooling = userSnapshot.cooling.minus(amount)
            break;
    }
  
    xEmbrSnapshot.save();
    userSnapshot.save();
}

export function createToken(tokenAddress: Address, index: BigInt): RewardToken {
    let erc20token = ERC20.bind(tokenAddress);
    let token = new RewardToken(tokenAddress.toHexString());
    let name = '';
    let symbol = '';
    let decimals = 0;
  
    // attempt to retrieve erc20 values
    let maybeName = erc20token.try_name();
    let maybeSymbol = erc20token.try_symbol();
    let maybeDecimals = erc20token.try_decimals();
  
    if (!maybeName.reverted) name = maybeName.value;
    if (!maybeSymbol.reverted) symbol = maybeSymbol.value;
    if (!maybeDecimals.reverted) decimals = maybeDecimals.value;
  
    token.name = name;
    token.symbol = symbol;
    token.xembr = XEMBR_ADDRESS.toHexString()
    token.decimals = decimals;
    token.expiry = 0;
    token.index = index;
    token.active = true;
    token.totalClaimed = ZERO_BD;
    token.totalUnclaimed = ZERO_BD;
    token.address = tokenAddress.toHexString();
    token.save();
    return token;
  }

export function getToken(tokenAddress: Address): RewardToken {
    let token = RewardToken.load(tokenAddress.toHexString());
    if (token == null) {
      let index = new BigInt(0)
      if (tokenAddress.toHexString() == EMBR_ADDRESS.toHexString()) { 
        index = REDEMPTION_INDEX
      }
      token = createToken(tokenAddress, index);
    }
    return token;
}

export function getTokenSnapshot(tokenAddress: Address, event: ethereum.Event): TokenSnapshot {
    let timestamp = event.block.timestamp.toI32();
    let dayID = timestamp / 86400;
    let id = tokenAddress.toHexString() + '-' + dayID.toString();
    let dayData = TokenSnapshot.load(id);
  
    if (dayData == null) {
      let dayStartTimestamp = dayID * 86400;
      let token = getToken(tokenAddress);
      dayData = new TokenSnapshot(id);
      dayData.timestamp = dayStartTimestamp;
      dayData.totalClaimed = token.totalClaimed;
      dayData.totalUnclaimed = token.totalUnclaimed;
      dayData.token = token.id;
      dayData.save();
    }
  
    return dayData;
}

export function getXEmbrSnapshot(event: ethereum.Event): XEmbrSnapshot {
    let timestamp = event.block.timestamp.toI32();
    let dayID = timestamp / 86400;
    let id = XEMBR_ADDRESS.toHexString() + '-' + dayID.toString();
    let dayData = XEmbrSnapshot.load(id);
    
    if (dayData == null) {
        let dayStartTimestamp = dayID * 86400;
        let xembr = getXEmbr();
        dayData = new XEmbrSnapshot(id);
        dayData.timestamp = dayStartTimestamp;
        dayData.totalStaking = xembr.totalStaking
        dayData.totalXembr = xembr.totalXembr
        dayData.totalCooling = xembr.totalCooling
        dayData.save();
    }

    return dayData
}


export function getUserReward(user: Address, rewardAddress: Address,event: ethereum.Event): UserReward { 

    let id = user.toHexString() + '-' + rewardAddress.toHexString();
    let userObj = getUser(user)
    let userReward = UserReward.load(id);
    if (userReward == null ) { 
        userReward = new UserReward(id);
        userReward.owner = userObj.id
        userReward.address = rewardAddress
    }
    userReward.timestamp = event.block.timestamp.toI32()
    userReward.block = event.block.number
    userReward.save()
    return userReward
}

export function getXEmbr(): XEmbr {
    let xembr = XEmbr.load(XEMBR_ADDRESS.toHexString());
    if (xembr == null) {
        xembr = new XEmbr(XEMBR_ADDRESS.toHexString())

        xembr.userCount = 0;
        xembr.tokenCount = 0;
        xembr.activeTokenCount = 0;

        xembr.totalStaking = ZERO_BD;
        xembr.totalXembr = ZERO_BD;
        xembr.totalCooling = ZERO_BD;
        xembr.save();
    }
    return xembr
}

export function getUserSnapshot(userAddr: Address, event: ethereum.Event): UserSnapshot {
    let timestamp = event.block.timestamp.toI32();
    let dayID = timestamp / 86400;
    let id = userAddr.toHexString() + '-' + dayID.toString();
    let dayData = UserSnapshot.load(id);
    if (dayData == null) {
        let user = getUser(userAddr);
        let dayStartTimestamp = dayID * 86400;
        dayData = new UserSnapshot(id);
        dayData.timestamp = dayStartTimestamp;
        dayData.owner = user.id 
        dayData.rewards = []
        dayData.staking = user.staking
        dayData.cooling =  user.cooling
        dayData.totalXembr = user.totalXembr;
        dayData.timestamp = timestamp
        dayData.save();
    }

    return dayData
}

export function getUser(userAddr: Address): User {
    let user = User.load(userAddr.toHexString());
    if (user == null) {
        user = new User(userAddr.toHexString())
        let xembr = getXEmbr()
        
        user.xembr = xembr.id

        user.staking = ZERO_BD;
        user.totalXembr = ZERO_BD;
        user.cooling = ZERO_BD;

        user.questsCompleted = 0;
        user.weightedTimestamp = 0;
        user.save()

    }
    return user
}



/*

// pool entity when created
export function newPoolEntity(poolId: string): Pool {
  let pool = new Pool(poolId);
  pool.vaultID = '2';
  pool.strategyType = i32(parseInt(poolId.slice(42, 46)));
  pool.tokensList = [];
  pool.totalWeight = ZERO_BD;
  pool.totalSwapVolume = ZERO_BD;
  pool.totalSwapFee = ZERO_BD;
  pool.totalLiquidity = ZERO_BD;
  pool.totalShares = ZERO_BD;
  pool.swapsCount = BigInt.fromI32(0);
  pool.holdersCount = BigInt.fromI32(0);

  return pool;
}

export function getPoolTokenId(poolId: string, tokenAddress: Address): string {
  return poolId.concat('-').concat(tokenAddress.toHexString());
}

export function loadPoolToken(poolId: string, tokenAddress: Address): PoolToken | null {
  return PoolToken.load(getPoolTokenId(poolId, tokenAddress));
}

export function createPoolTokenEntity(poolId: string, tokenAddress: Address): void {
  let poolTokenId = getPoolTokenId(poolId, tokenAddress);

  let token = ERC20.bind(tokenAddress);
  let symbol = '';
  let name = '';
  let decimals = 18;

  let symbolCall = token.try_symbol();
  let nameCall = token.try_name();
  let decimalCall = token.try_decimals();

  if (symbolCall.reverted) {
    // TODO
    //const symbolBytesCall = tokenBytes.try_symbol();
    //if (!symbolBytesCall.reverted) {
    //symbol = symbolBytesCall.value.toString();
  } else {
    symbol = symbolCall.value;
  }

  if (nameCall.reverted) {
    //const nameBytesCall = tokenBytes.try_name();
    //if (!nameBytesCall.reverted) {
    //name = nameBytesCall.value.toString();
    //}
  } else {
    name = nameCall.value;
  }

  if (!decimalCall.reverted) {
    decimals = decimalCall.value;
  }

  let poolToken = new PoolToken(poolTokenId);
  // ensures token entity is created
  let _token = getToken(tokenAddress);
  poolToken.poolId = poolId;
  poolToken.address = tokenAddress.toHexString();
  poolToken.name = name;
  poolToken.symbol = symbol;
  poolToken.decimals = decimals;
  poolToken.balance = ZERO_BD;
  poolToken.invested = ZERO_BD;
  poolToken.priceRate = ONE_BD;
  poolToken.token = _token.id;
  poolToken.save();
}

export function loadPriceRateProvider(poolId: string, tokenAddress: Address): PriceRateProvider | null {
  return PriceRateProvider.load(getPoolTokenId(poolId, tokenAddress));
}

export function getTokenPriceId(
  poolId: string,
  tokenAddress: Address,
  stableTokenAddress: Address,
  block: BigInt
): string {
  return poolId
    .concat('-')
    .concat(tokenAddress.toHexString())
    .concat('-')
    .concat(stableTokenAddress.toHexString())
    .concat('-')
    .concat(block.toString());
}

export function createPoolSnapshot(poolId: string, timestamp: i32): void {
  let dayTimestamp = timestamp - (timestamp % DAY); // Todays Timestamp

  let pool = Pool.load(poolId);
  if (pool == null) return;

  // Save pool snapshot
  let snapshotId = poolId + '-' + dayTimestamp.toString();
  let snapshot = new PoolSnapshot(snapshotId);

  if (!pool.tokensList) {
    return;
  }

  let tokens = pool.tokensList;
  let amounts = new Array<BigDecimal>(tokens.length);
  for (let i = 0; i < tokens.length; i++) {
    let token = tokens[i];
    let tokenAddress = Address.fromString(token.toHexString());
    let poolToken = loadPoolToken(poolId, tokenAddress);
    if (poolToken == null) continue;

    amounts[i] = poolToken.balance;
  }

  snapshot.pool = poolId;
  snapshot.amounts = amounts;
  snapshot.totalShares = pool.totalShares;
  snapshot.swapVolume = ZERO_BD;
  snapshot.swapFees = pool.totalSwapFee;
  snapshot.timestamp = dayTimestamp;
  snapshot.totalLiquidity = pool.totalLiquidity;
  snapshot.totalSwapFee = pool.totalSwapFee;
  snapshot.totalSwapVolume = pool.totalSwapVolume;
  snapshot.swapsCount = pool.swapsCount;
  snapshot.holdersCount = pool.holdersCount;
  snapshot.save();
}

export function saveSwapToSnapshot(poolAddress: string, timestamp: i32, volume: BigDecimal, fees: BigDecimal): void {
  let dayTimestamp = timestamp - (timestamp % DAY); // Todays timestamp

  // Save pool snapshot
  let snapshotId = poolAddress + '-' + dayTimestamp.toString();
  let snapshot = PoolSnapshot.load(snapshotId);

  if (!snapshot) {
    return;
  }

  snapshot.swapVolume = snapshot.swapVolume.plus(volume);
  snapshot.swapFees = snapshot.swapFees.plus(fees);
  snapshot.save();
}









export function uptickSwapsForToken(tokenAddress: Address, event: ethereum.Event): void {
  let token = getToken(tokenAddress);
  // update the overall swap count for the token
  token.totalSwapCount = token.totalSwapCount.plus(BigInt.fromI32(1));
  token.save();

  // update the snapshots
  let snapshot = getTokenSnapshot(tokenAddress, event);
  snapshot.totalSwapCount = token.totalSwapCount;
  snapshot.save();
}

export function updateTokenBalances(
  tokenAddress: Address,
  notionalBalance: BigDecimal,
  tokenBalanceEvent: TokenBalanceEvent,
  event: ethereum.Event
): void {
  let token = getToken(tokenAddress);

  switch (tokenBalanceEvent) {
    case TokenBalanceEvent.SWAP_IN:
      token.totalBalanceNotional = token.totalBalanceNotional.plus(notionalBalance);
      token.totalVolumeNotional = token.totalVolumeNotional.plus(notionalBalance);
      break;
    case TokenBalanceEvent.SWAP_OUT:
      token.totalBalanceNotional = token.totalBalanceNotional.minus(notionalBalance);
      token.totalVolumeNotional = token.totalVolumeNotional.plus(notionalBalance);
      break;
    case TokenBalanceEvent.JOIN:
      token.totalBalanceNotional = token.totalBalanceNotional.plus(notionalBalance);
      break;
    case TokenBalanceEvent.EXIT:
      token.totalBalanceNotional = token.totalBalanceNotional.minus(notionalBalance);
      break;
  }

  let latestPriceId = token.latestPrice;

  if (latestPriceId) {
    let latestPrice = LatestPrice.load(latestPriceId);

    if (latestPrice) {
      if(tokenAddress == Address.fromString("0xb31f66aa3c1e785363f0875a1b74e27b85fd66c7"))
      {
        const highestPriceForAvax = BigDecimal.fromString('500')
        if (latestPrice.priceUSD.le(highestPriceForAvax)) { 
          token.totalBalanceUSD = token.totalBalanceNotional.times(latestPrice.priceUSD);
          token.totalVolumeUSD = token.totalVolumeUSD.plus(notionalBalance.times(latestPrice.priceUSD));
        }
      } else { 
        token.totalBalanceUSD = token.totalBalanceNotional.times(latestPrice.priceUSD);
        token.totalVolumeUSD = token.totalVolumeUSD.plus(notionalBalance.times(latestPrice.priceUSD));
      }
    }
  }

  let tokenSnapshot = getTokenSnapshot(tokenAddress, event);
  tokenSnapshot.totalBalanceNotional = token.totalBalanceNotional;
  tokenSnapshot.totalVolumeNotional = token.totalVolumeNotional;
  tokenSnapshot.totalBalanceUSD = token.totalBalanceUSD;
  tokenSnapshot.totalVolumeUSD = token.totalVolumeUSD;

  tokenSnapshot.save();
  token.save();
}

export function getTradePair(token0Address: Address, token1Address: Address): TradePair {
  let sortedAddresses = new Array<string>(2);
  sortedAddresses[0] = token0Address.toHexString();
  sortedAddresses[1] = token1Address.toHexString();
  sortedAddresses.sort();

  let tradePairId = sortedAddresses[0] + '-' + sortedAddresses[1];
  let tradePair = TradePair.load(tradePairId);
  if (tradePair == null) {
    tradePair = new TradePair(tradePairId);
    tradePair.token0 = sortedAddresses[0];
    tradePair.token1 = sortedAddresses[1];
    tradePair.totalSwapFee = ZERO_BD;
    tradePair.totalSwapVolume = ZERO_BD;
    tradePair.save();
  }
  return tradePair;
}

export function getTradePairSnapshot(tradePairId: string, timestamp: i32): TradePairSnapshot {
  let dayID = timestamp / 86400;
  let id = tradePairId + '-' + dayID.toString();
  let snapshot = TradePairSnapshot.load(id);
  if (snapshot == null) {
    let dayStartTimestamp = dayID * 86400;
    let tradePair = TradePair.load(tradePairId);

    snapshot = new TradePairSnapshot(id);
    snapshot.pair = tradePairId;
    snapshot.timestamp = dayStartTimestamp;
    snapshot.totalSwapVolume = tradePair != null ? tradePair.totalSwapVolume : ZERO_BD;
    snapshot.totalSwapFee = tradePair != null ? tradePair.totalSwapFee : ZERO_BD;
    snapshot.save();
  }
  return snapshot;
}

export function getBalancerSnapshot(vaultId: string, timestamp: i32): BalancerSnapshot {
  let dayID = timestamp / 86400;
  let id = vaultId + '-' + dayID.toString();
  let snapshot = BalancerSnapshot.load(id);

  if (snapshot == null) {
    let dayStartTimestamp = dayID * 86400;
    snapshot = new BalancerSnapshot(id);
    // we know that the vault should be created by this call
    let vault = Balancer.load('2') as Balancer;
    snapshot.poolCount = vault.poolCount;

    snapshot.totalLiquidity = vault.totalLiquidity;
    snapshot.totalSwapFee = vault.totalSwapFee;
    snapshot.totalSwapVolume = vault.totalSwapVolume;
    snapshot.totalSwapCount = vault.totalSwapCount;
    snapshot.vault = vaultId;
    snapshot.timestamp = dayStartTimestamp;
    snapshot.save();
  }

  return snapshot;
}

*/
