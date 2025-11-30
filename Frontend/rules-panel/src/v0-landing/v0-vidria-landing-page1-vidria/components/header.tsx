import Image from "next/image"
import Link from "next/link"
import { Button } from "@/components/ui/button"

export function Header() {
    return (
        <header className="w-full sticky top-0 z-50 bg-background border-b">
            <div className="container flex h-32 items-center justify-between">
                <Link href="/" className="flex items-center gap-2">
                    <Image
                        src="/1-9c7d296f.png"
                        alt="Vidria Logo"
                        width={240}
                        height={80}
                        className="h-24 w-auto object-contain"
                        priority
                    />
                </Link>
                <div className="flex items-center gap-4">
                    <Button variant="ghost" asChild>
                        <Link href="/login">Ingresar</Link>
                    </Button>
                    <Button asChild>
                        <Link href="/signup">Crear una cuenta</Link>
                    </Button>
                </div>
            </div>
        </header>
    )
}
