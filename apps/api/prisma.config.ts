import { defineConfig } from '@prisma/config'
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

dotenv.config({ path: path.join(__dirname, '.env') })

console.log('PRISMA_CONFIG_DEBUG: Loaded DATABASE_URL length:', process.env.DATABASE_URL?.length || 0)

export default defineConfig({
    datasource: {
        url: process.env.DATABASE_URL || "",
    },
})
