const demoMode = process.env.NEXT_PUBLIC_DEMO_MODE !== 'false';

// Visible on every page while the platform runs as a study/demo environment,
// so nobody mistakes simulated payments or fictitious data for real ones.
export function DemoBanner() {
  if (!demoMode) return null;
  return (
    <div className="demo-banner" role="note">
      <strong>Ambiente de demonstração.</strong> Dados fictícios e pagamentos
      simulados — nenhuma cobrança real é feita.
    </div>
  );
}
