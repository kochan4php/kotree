export default function Footer() {
    return (
        <footer>
            <p className="text-center text-base font-medium">
                &copy; Copyright 2022 &#8211; {new Date().getFullYear()}{' '}
                <a href="https://github.com/kochan4php" className="transition-all duration-300 hover:text-sky-500" target="_blank">
                    Kochan.php
                </a>
            </p>
        </footer>
    );
}
