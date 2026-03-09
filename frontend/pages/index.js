import Link from 'next/link';

const HomePage = () => {
  return (
    <div>
      <h1>Mission Control</h1>
      <Link href="/agents">
        <a>Agent Dashboard</a>
      </Link>
      {/* Other links will go here */}
    </div>
  );
};

export default HomePage;