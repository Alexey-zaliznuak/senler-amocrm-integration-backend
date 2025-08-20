export const INCREMENT_SLIDING_WINDOW_RATE_LUA_SCRIPT = `
-- KEYS[1] = ключ ZSET, напр. "rl:{userId}"
-- KEYS[2] = ключ seq,   напр. "rl:{userId}:seq"
-- ARGV[1] = window_ms
-- ARGV[2] = max_rate
-- ARGV[3] = increment (сколько «запросов» сразу)
-- Возвращает: { allowed (0/1), new_count }

local key     = KEYS[1]
local seqKey  = KEYS[2]
local window  = tonumber(ARGV[1])
local maxRate = tonumber(ARGV[2])
local inc     = tonumber(ARGV[3])

-- время сервера в мс
local t = redis.call('TIME')
local now = t[1]*1000 + math.floor(t[2]/1000)
local start = now - window

-- удалить старые события
redis.call('ZREMRANGEBYSCORE', key, 0, start)

local count = redis.call('ZCARD', key)
local allowed = 0
local newCount = count

if (count + inc) <= maxRate then
  -- добавить inc записей с уникальными членами
  for i = 1, inc do
    local seq = redis.call('INCR', seqKey)
    local member = tostring(now) .. '-' .. tostring(seq)
    redis.call('ZADD', key, now, member)
  end
  newCount = count + inc
  allowed = 1
end

-- TTL: окно + «запас» (1s)
redis.call('PEXPIRE', key, window + 1000)
-- seq можно чистить реже; пусть живёт дольше окна
redis.call('PEXPIRE', seqKey, math.max(window*10, 60000))

return {allowed, newCount}
`;
