/** Atribusi penyedia peta (wajib ditampilkan), di pojok kanan bawah peta. */
export default function Credits({ credit }) {
  return (
    <footer className="credits">
      {credit.map(([text, href]) => <a key={href} href={href} target="_blank" rel="noreferrer">{text}</a>)}
    </footer>
  )
}
