import { Compass } from 'lucide-react';
import { ButtonLink, EmptyState } from '../components/ui';

export function NotFound() {
  return (
    <EmptyState
      icon={<Compass size={20} />}
      title="Page not found"
      body="That route does not exist, or the topic or exam it points at is no longer in the roadmap."
      action={
        <div className="flex flex-col gap-2 sm:flex-row">
          <ButtonLink to="/" size="sm">
            Back to dashboard
          </ButtonLink>
          <ButtonLink to="/roadmap" variant="secondary" size="sm">
            Open the roadmap
          </ButtonLink>
        </div>
      }
    />
  );
}
