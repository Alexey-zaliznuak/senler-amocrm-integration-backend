export * from './exists.prisma-extension'
// import { Prisma } from '@prisma/client';
// import { createClient } from 'redis';




// const redis = createClient({
//   url: 'redis://localhost:6379', // Укажите ваш Redis сервер
// });

// redis.connect();

// export const cachingExtension = Prisma.defineExtension({
//   model: {
//     $allModels: {
//       async findUnique(args) {
//         const cacheKey = `findUnique:${JSON.stringify(args)}`;
//         const cachedResult = await redis.get(cacheKey);

//         if (cachedResult) {
//           console.log('Cache hit');
//           return JSON.parse(cachedResult);
//         }

//         console.log('Cache miss');
//         const result = await this._findUnique(args);
//         await redis.setEx(cacheKey, 1000, JSON.stringify(result));
//         return result;
//       },

//       async findUniqueOrThrow(args) {
//         const cacheKey = `findUniqueOrThrow:${JSON.stringify(args)}`;
//         const cachedResult = await redis.get(cacheKey);

//         if (cachedResult) {
//           console.log('Cache hit');
//           return JSON.parse(cachedResult);
//         }

//         console.log('Cache miss');
//         const result = await this._findUniqueOrThrow(args);
//         await redis.setEx(cacheKey, 1000, JSON.stringify(result));
//         return result;
//       },
//     },
//   },
// });
