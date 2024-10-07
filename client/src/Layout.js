import Header from './Header'; // Certifique-se de que o caminho está correto
import { Outlet } from 'react-router-dom';

export default function Layout() {
    return (
        <main>
            <Header />
            <Outlet />
        </main>
    );
}
