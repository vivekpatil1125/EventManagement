import { useEffect, useState } from 'react';
import { userService } from '../../../services/api';
import './ProfileTab.css';

const getProfileFields = (data) => ({
  id: data.id ?? data.Id,
  name: data.name || data.fullName || data.FullName || '',
  email: data.email || data.Email || '',
  department: data.department || data.Department || '',
  role: data.role || data.Role || 'Employee',
  createdAt: data.createdAt || data.CreatedAt || null
});

export default function ProfileTab({ currentUser, onProfileUpdated }) {
  const [profile, setProfile] = useState(() => getProfileFields(currentUser));
  const [form, setForm] = useState(() => ({
    name: currentUser.name || '',
    department: currentUser.department || ''
  }));
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    let isMounted = true;

    userService.getProfile()
      .then(({ data }) => {
        if (!isMounted) return;
        const loadedProfile = getProfileFields(data);
        setProfile(loadedProfile);
        setForm({ name: loadedProfile.name, department: loadedProfile.department });
      })
      .catch((requestError) => {
        if (!isMounted) return;
        console.error('Failed to load employee profile:', requestError);
        setError(requestError.response?.data?.message || 'Your profile could not be loaded. Please try again.');
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const handleCancel = () => {
    setForm({ name: profile.name, department: profile.department });
    setEditing(false);
    setError('');
    setSuccess('');
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setSuccess('');

    const name = form.name.trim();
    const department = form.department.trim();
    if (name.length < 2 || name.length > 100) {
      setError('Enter a name between 2 and 100 characters.');
      return;
    }
    if (!department || department.length > 50) {
      setError('Enter a department between 1 and 50 characters.');
      return;
    }

    setSaving(true);
    try {
      const { data } = await userService.updateProfile({ name, department });
      const updatedProfile = getProfileFields(data);
      setProfile(updatedProfile);
      setForm({ name: updatedProfile.name, department: updatedProfile.department });
      onProfileUpdated?.(updatedProfile);
      setEditing(false);
      setSuccess('Your profile has been updated.');
    } catch (requestError) {
      console.error('Failed to update employee profile:', requestError);
      setError(requestError.response?.data?.message || 'Your profile could not be updated. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const memberSince = profile.createdAt
    ? new Date(profile.createdAt).toLocaleDateString(undefined, { month: 'long', year: 'numeric' })
    : 'EventSync member';

  return (
    <section className="profile-page">
      <div className="profile-heading">
        <div>
          <span className="profile-eyebrow">ACCOUNT</span>
          <h3>My profile</h3>
          <p>Manage your personal information and account details.</p>
        </div>
        {!editing && (
          <button className="profile-edit-button" type="button" disabled={loading} onClick={() => {
            setError('');
            setSuccess('');
            setEditing(true);
          }}>
            <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M12 20h9M16.5 3.5a2.12 2.12 0 0 1 3 3L8 18l-4 1 1-4Z" />
            </svg>
            Edit profile
          </button>
        )}
      </div>

      <div className="profile-layout">
        <aside className="profile-summary-card">
          <div className="profile-avatar" aria-hidden="true">
            {(profile.name || 'E').trim().charAt(0).toUpperCase()}
          </div>
          <h4>{profile.name || 'Employee'}</h4>
          <p>{profile.role}</p>
          <span className="profile-member-since">Member since {memberSince}</span>
          <div className="profile-summary-divider" />
          <div className="profile-summary-detail">
            <span className="profile-summary-icon" aria-hidden="true">@</span>
            <span>{profile.email || 'Email unavailable'}</span>
          </div>
          <div className="profile-summary-detail">
            <span className="profile-summary-icon" aria-hidden="true">⌂</span>
            <span>{profile.department || 'Department not set'}</span>
          </div>
          <div className="profile-account-status">
            <span />
            Active account
          </div>
        </aside>

        <div className="profile-details-card">
          <div className="profile-details-heading">
            <div>
              <h4>Personal information</h4>
              <p>Update the details associated with your account.</p>
            </div>
            {loading && <span className="profile-loading-label">Loading profile…</span>}
          </div>

          {error && <div className="profile-message error" role="alert">{error}</div>}
          {success && <div className="profile-message success" role="status">{success}</div>}

          <form onSubmit={handleSubmit}>
            <div className="profile-fields">
              <label className="profile-field" htmlFor="profile-name">
                <span>Full name</span>
                <input
                  id="profile-name"
                  type="text"
                  autoComplete="name"
                  maxLength="100"
                  minLength="2"
                  required
                  readOnly={!editing}
                  value={editing ? form.name : profile.name}
                  onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
                />
              </label>

              <label className="profile-field" htmlFor="profile-email">
                <span>Email address <small>Managed by your sign-in</small></span>
                <input
                  id="profile-email"
                  type="email"
                  autoComplete="email"
                  readOnly
                  value={profile.email}
                />
              </label>

              <label className="profile-field" htmlFor="profile-department">
                <span>Department</span>
                <input
                  id="profile-department"
                  type="text"
                  maxLength="50"
                  required
                  readOnly={!editing}
                  value={editing ? form.department : profile.department}
                  onChange={(event) => setForm((current) => ({ ...current, department: event.target.value }))}
                />
              </label>

              <label className="profile-field" htmlFor="profile-role">
                <span>Account role <small>Assigned by your administrator</small></span>
                <input id="profile-role" type="text" readOnly value={profile.role} />
              </label>
            </div>

            {editing && (
              <div className="profile-form-actions">
                <button className="profile-cancel-button" type="button" disabled={saving} onClick={handleCancel}>
                  Cancel
                </button>
                <button className="profile-save-button" type="submit" disabled={saving || loading}>
                  {saving ? 'Saving changes…' : 'Save changes'}
                </button>
              </div>
            )}
          </form>

          <div className="profile-security-note">
            <span className="profile-security-icon" aria-hidden="true">i</span>
            <p>Your email and role are managed by your organization and can’t be changed here.</p>
          </div>
        </div>
      </div>
    </section>
  );
}
