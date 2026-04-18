import { useRouter } from 'next/router'
import { useAuth, useTheme } from '../lib/context'
import { sounds } from '../lib/sounds'
import AppShell from '../components/app_shell'
import { LavouraPage } from '../components/lavoura'

/**
 * /lavoura — rota nativa da lavoura.
 *
 * Primeira rota extraída do monolito SPA do `pages/index.js`. A regra de
 * negócio da lavoura permanece intacta em `components/lavoura.js`; aqui só
 * trocamos "a casa" dela para o roteamento baseado em arquivo do Next.
 */
export default function LavouraRoute() {
  const router = useRouter()
  const { user, api, notify } = useAuth()
  const { T } = useTheme()

  // Quando o usuário clica num item de menu que NÃO é Lavoura, voltamos ao
  // index.js (que ainda hospeda as demais páginas) com a intenção preservada
  // via sessionStorage. Lavoura em si é tratada pelo <Link> dentro da Sidebar.
  const setPage = (id) => {
    if (id === 'lavoura') return
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('gvrpnl_targetPage', id)
    }
    router.push('/')
  }

  return (
    <AppShell currentPage="lavoura" setPage={setPage}>
      <LavouraPage T={T} user={user} api={api} notify={notify} sounds={sounds}/>
    </AppShell>
  )
}
