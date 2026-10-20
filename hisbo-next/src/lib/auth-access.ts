export function appAccess(publicView: boolean, loading: boolean, signedIn: boolean, guest: boolean) {
  if (publicView) return 'allow';
  if (loading) return 'loading';
  return signedIn || guest ? 'allow' : 'login';
}
