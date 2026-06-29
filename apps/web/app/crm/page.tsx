import { Nav } from "../_components/nav";
import { Board } from "./board";

export const dynamic = "force-dynamic";

export default function CrmPage() {
  return (
    <>
      <Nav />
      <main className="mx-auto flex max-w-full flex-col gap-6 p-6">
        <h1 className="text-2xl font-bold">CRM</h1>
        <p className="text-sm text-neutral-500">
          Pipeline comercial. Cartões ordenados por ICP score (prioridade). Mude o status pelo seletor.
        </p>
        <Board />
      </main>
    </>
  );
}
