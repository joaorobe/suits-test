"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FcBusinessman } from "react-icons/fc";

export default function LoginPage() {
	const [cpf, setCpf] = useState("");
	const [password, setPassword] = useState("");
	const [showPassword, setShowPassword] = useState(false);
	const [remember, setRemember] = useState(false);

	const router = useRouter();
	function formatCpf(value: string) {
		const onlyDigits = value.replace(/\D/g, "").slice(0, 11);
		const parts = [] as string[];
		if (onlyDigits.length > 3) {
			parts.push(onlyDigits.slice(0, 3));
			if (onlyDigits.length > 6) {
				parts.push(onlyDigits.slice(3, 6));
				if (onlyDigits.length > 9) {
					parts.push(onlyDigits.slice(6, 9));
					parts.push(onlyDigits.slice(9, 11));
				} else {
					parts.push(onlyDigits.slice(6));
				}
			} else {
				parts.push(onlyDigits.slice(3));
			}
		} else {
			parts.push(onlyDigits);
		}

		if (parts.length === 4) return `${parts[0]}.${parts[1]}.${parts[2]}-${parts[3]}`;
		if (parts.length === 3) return `${parts[0]}.${parts[1]}.${parts[2]}`;
		if (parts.length === 2) return `${parts[0]}.${parts[1]}`;
		return parts[0] || "";
	}

	function handleCpfChange(value: string) {
		setCpf(formatCpf(value));
	}

	function handleSubmit(e: React.FormEvent) {
		e.preventDefault();
		console.log({ cpf, password, remember });
		router.push("/inventory");
	}

	return (
		<div className="min-h-screen bg-[#17182b] flex flex-col items-center justify-center p-6">
			<header className="text-center mb-8">
				<div className="w-48 h-20 flex items-center justify-center">
					<img src="/logo.png" alt="Suits" className="max-h-full object-contain" />
				</div>
			</header>

			<main className="w-full max-w-md">
				<div className="rounded-lg overflow-hidden shadow-xl">
					<div className="bg-[#232935] text-white py-6 px-6 text-center">
						<div className="flex flex-col items-center">
							<div className=" rounded-full p-3 mb-2">
								<FcBusinessman size={34} />
							</div>
							<h2 className="font-semibold text-lg">Login</h2>
							<p className="text-xs text-white/70">Acesse sua área de trabalho</p>
						</div>
					</div>

					<form className="bg-white p-6" onSubmit={handleSubmit}>
						<label className="text-xs text-gray-500 uppercase">CPF</label>
						<div className="mt-1 mb-4">
							<input
								value={cpf}
								onChange={(e) => handleCpfChange(e.target.value)}
								placeholder="000.000.000-00"
								className="w-full border border-gray-200 rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#232935]"
							/>
						</div>

						<label className="text-xs text-gray-500 uppercase">Senha</label>
						<div className="mt-1 mb-3 relative">
							<input
								type={showPassword ? "text" : "password"}
								value={password}
								onChange={(e) => setPassword(e.target.value)}
								placeholder="*******"
								className="w-full border border-gray-200 rounded px-3 py-2 text-sm pr-10 focus:outline-none focus:ring-1 focus:ring-[#232935]"
							/>
							<button
								type="button"
								onClick={() => setShowPassword((s) => !s)}
								className="absolute right-2 top-2 text-gray-500"
								aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
							>
								{showPassword ? (
									<span></span>
								) : (
									<span></span>
								)}
							</button>
						</div>

						<div className="flex items-center justify-between text-sm mb-4">
							<label className="flex items-center gap-2">
								<input
									type="checkbox"
									checked={remember}
									onChange={(e) => setRemember(e.target.checked)}
									className="h-4 w-4"
								/>
								<span className="text-sm text-gray-600">Lembrar-me</span>
							</label>
							<Link href="#" className="text-xs text-blue-500">
								Esqueci minha senha
							</Link>
						</div>

						<button
							type="submit"
							className="w-full bg-[#0f1724] text-white py-2 rounded hover:opacity-95 disabled:opacity-50"
						>
							Entrar
						</button>
					</form>
				</div>
			</main>
		</div>
	);
}

