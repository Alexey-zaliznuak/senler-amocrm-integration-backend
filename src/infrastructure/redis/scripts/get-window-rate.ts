export const GET_SLIDING_WINDOW_RATE_LUA_SCRIPT = `
-- KEYS[1] = ключ ZSET, напр. "rl:{userId}"
-- ARGV[1] = window_ms
-- Возвращает: {count, now_ms}

local key    = KEYS[1]
local window = tonumber(ARGV[1])

-- точное время сервера
local t = redis.call('TIME')
local now = t[1]*1000 + math.floor(t[2]/1000)

-- подчистить устаревшие записи до начала окна
redis.call('ZREMRANGEBYSCORE', key, 0, now - window)

-- текущий размер окна
local count = redis.call('ZCARD', key)

-- поддержать TTL (чуть больше окна)
redis.call('PEXPIRE', key, window + 1000)

return {count, now}
`
