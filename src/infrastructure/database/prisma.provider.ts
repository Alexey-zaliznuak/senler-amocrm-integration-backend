import { PrismaClient } from "@prisma/client";
import { existsExtension } from "./exists.prisma-extension";

export const prisma = new PrismaClient()
.$extends(existsExtension);
