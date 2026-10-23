import React, { useState } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { createUseStyles } from 'react-jss';

const useStyles = createUseStyles({
  page: {
    maxWidth: '720px!important',
    paddingTop: '20px',
  },
  card: {
    background: 'var(--white-color)',
    border: '1px solid var(--text-color-quinary)',
    borderRadius: 4,
    padding: '24px',
  },
  title: {
    fontSize: 26,
    fontWeight: 700,
    marginBottom: 8,
  },
  label: {
    display: 'block',
    fontWeight: 600,
    marginTop: 14,
    marginBottom: 6,
  },
  submitBtn: {
    marginTop: 16,
    padding: '8px 20px',
    background: '#00a2ff',
    color: '#fff',
    border: 'none',
    borderRadius: 4,
    fontWeight: 700,
    cursor: 'pointer',
  },
});

const ReportCenterPage = () => {
  const s = useStyles();
  const router = useRouter();
  const [reason, setReason] = useState('InappropriateContent');
  const [comment, setComment] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const targetId = router.query.id || router.query.assetId || router.query.userId || '';

  return (
    <div className={`container ${s.page}`}>
      <Head>
        <title>Report Abuse - ROBLOX</title>
      </Head>
      <div className={s.card}>
        <h2 className={s.title}>Report Abuse</h2>
        <p>
          Tell our moderators about content or behavior that violates the Roblox Community
          Standards.
        </p>
        {submitted ? (
          <div className="alert alert-success mt-3">
            Thank you for your report. For formal Trust &amp; Safety escalation, you can also submit
            directly via{' '}
            <a
              href={`https://www.roblox.com/abusereport/userprofile?id=${encodeURIComponent(
                targetId
              )}&rbx_native=1`}
              data-rbx-native="1"
            >
              Official Roblox Abuse Reporting
            </a>
            .
          </div>
        ) : (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              setSubmitted(true);
            }}
          >
            <label className={s.label}>Which rule is being broken?</label>
            <select
              className="form-control"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            >
              <option value="InappropriateContent">Inappropriate Content or Asset</option>
              <option value="Harassment">Bullying or Harassment</option>
              <option value="Scamming">Scamming or Phishing</option>
              <option value="Spam">Spam</option>
              <option value="Other">Other Rule Violation</option>
            </select>

            <label className={s.label}>Short Description</label>
            <textarea
              className="form-control"
              rows={5}
              maxLength={1000}
              required
              placeholder="Provide details about the issue..."
              value={comment}
              onChange={(e) => setComment(e.target.value)}
            />

            <div className="d-flex align-items-center gap-3">
              <button type="submit" className={s.submitBtn}>
                Submit Report
              </button>
              <a
                className="mt-3"
                href="https://en.help.roblox.com/hc/en-us/articles/203312410"
                target="_blank"
                rel="noreferrer"
              >
                Open Official Roblox Safety Form
              </a>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default ReportCenterPage;
