export const CREATE_SET_LUA_SCRIPT = `
local exists = redis.call('EXISTS', KEYS[1])
if exists == 1 then
return 0
end

for i = 2, #ARGV do
redis.call('SADD', KEYS[1], ARGV[i])
end

local ttl = tonumber(ARGV[1])
if ttl ~= nil and ttl > 0 then
redis.call('EXPIRE', KEYS[1], ttl)
end

return 1
`;
