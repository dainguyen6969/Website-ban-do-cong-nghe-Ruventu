import { useParams } from 'react-router-dom';
import SearchPage from './SearchPage';

export default function CategoryPage() {
  const { slug } = useParams();
  return <SearchPage key={slug} categorySlug={slug} />;
}
