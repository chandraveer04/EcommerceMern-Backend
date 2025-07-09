import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
	plugins: [react()],
	server: {
		host: '0.0.0.0', // Allow connections from any IP address
		port: 3000,
		proxy: {
			"/api": {
				target: process.env.API_URL || "http://localhost:5000",
			},
		},
	},
});