export default function Placeholder({ title }: { title: string }) {
  return (
    <>
      <h1 className="page-title">{title}</h1>
      <div className="panel">
        <p className="muted">Questa sezione sarà disponibile nelle prossime fasi.</p>
      </div>
    </>
  )
}
