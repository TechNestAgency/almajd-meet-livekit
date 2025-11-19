'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';

interface WaitingPageProps {
  requestId?: string;
  studentName?: string;
  roomLink?: string;
}

export default function WaitingPage() {
  const params = useParams();
  const router = useRouter();
  const roomLink = params.roomLink as string;
  
  const [requestId, setRequestId] = useState<string | null>(null);
  const [studentName, setStudentName] = useState<string>('');
  const [status, setStatus] = useState<'PENDING' | 'APPROVED' | 'REJECTED' | 'LOADING'>('LOADING');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Check if we have requestId and name in URL params or localStorage
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const storedRequestId = localStorage.getItem(`waiting_request_${roomLink}`);
    const storedName = localStorage.getItem(`waiting_name_${roomLink}`);
    
    const reqId = urlParams.get('requestId') || storedRequestId;
    const name = urlParams.get('name') || storedName || '';

    if (reqId) {
      setRequestId(reqId);
      if (name) {
        setStudentName(name);
      }
      setStatus('PENDING');
      // Start polling will be set up in separate effect
    } else if (name) {
      setStudentName(name);
      // Submit new request
      submitRequest(name);
    } else {
      setError('Missing request information');
      setStatus('REJECTED');
    }
  }, [roomLink]);

  // Start polling when we have a requestId
  useEffect(() => {
    if (requestId && status === 'PENDING') {
      const pollInterval = startPolling(requestId);
      return () => {
        if (pollInterval) {
          clearInterval(pollInterval);
        }
      };
    }
  }, [requestId, status]);

  const submitRequest = async (name: string) => {
    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch('/api/room/waiting-list', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: name.trim(),
          roomLink: roomLink
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 409 && data.requestId) {
          // Request already exists, use existing requestId
          setRequestId(data.requestId);
          setStudentName(name.trim()); // Ensure name is set
          setStatus('PENDING');
          localStorage.setItem(`waiting_request_${roomLink}`, data.requestId);
          localStorage.setItem(`waiting_name_${roomLink}`, name.trim());
          // Start polling will be handled by useEffect
        } else {
          setError(data.error || 'Failed to submit request');
          setStatus('REJECTED');
        }
        setIsSubmitting(false);
        return;
      }

      setRequestId(data.id);
      setStudentName(name.trim()); // Ensure name is set
      setStatus('PENDING');
      localStorage.setItem(`waiting_request_${roomLink}`, data.id);
      localStorage.setItem(`waiting_name_${roomLink}`, name.trim());
      // Start polling will be handled by useEffect
    } catch (err) {
      setError('Failed to submit request. Please try again.');
      setStatus('REJECTED');
    } finally {
      setIsSubmitting(false);
    }
  };

  const startPolling = (reqId: string): NodeJS.Timeout => {
    const pollInterval = setInterval(async () => {
      try {
        const response = await fetch(`/api/room/approve-participant?requestId=${reqId}`);
        const data = await response.json();

        if (response.ok && data.status) {
          if (data.status === 'APPROVED') {
            clearInterval(pollInterval);
            setStatus('APPROVED');
            // Update studentName from response if not set
            const finalName = data.name || studentName || 'Guest';
            setStudentName(finalName);
            
            // Redirect to room after short delay - go directly to room, bypassing waiting list
            setTimeout(() => {
              localStorage.removeItem(`waiting_request_${roomLink}`);
              localStorage.removeItem(`waiting_name_${roomLink}`);
              // Redirect to guest room with name and approved flag - this will join the meeting directly
              window.location.href = `/${roomLink}/g?name=${encodeURIComponent(finalName)}&approved=true`;
            }, 1500);
          } else if (data.status === 'REJECTED') {
            clearInterval(pollInterval);
            setStatus('REJECTED');
            setError('Your request was rejected by the host');
          }
        }
      } catch (err) {
        console.error('Error polling request status:', err);
      }
    }, 2000); // Poll every 2 seconds

    return pollInterval;
  };

  if (status === 'LOADING' || isSubmitting) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">
            {isSubmitting ? 'Submitting your request...' : 'Loading...'}
          </p>
        </div>
      </div>
    );
  }

  if (status === 'REJECTED') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-pink-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Request Rejected</h1>
          <p className="text-gray-600 mb-6">
            {error || 'Your request to join the meeting was rejected by the host.'}
          </p>
          <button
            onClick={() => {
              localStorage.removeItem(`waiting_request_${roomLink}`);
              localStorage.removeItem(`waiting_name_${roomLink}`);
              router.push(`/${roomLink}/g`);
            }}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (status === 'APPROVED') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Request Approved!</h1>
          <p className="text-gray-600 mb-6">
            You're being redirected to the meeting...
          </p>
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mx-auto"></div>
        </div>
      </div>
    );
  }

  // PENDING status
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse">
            <svg className="w-10 h-10 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Waiting for Host Approval
          </h1>
          <p className="text-gray-600 mb-2">
            {studentName && `Hello, ${studentName}!`}
          </p>
          <p className="text-sm text-gray-500">
            Your request has been submitted. The host will be notified and can approve your request.
          </p>
        </div>

        <div className="space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center space-x-3">
              <div className="flex-shrink-0">
                <div className="w-2 h-2 bg-blue-600 rounded-full animate-pulse"></div>
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-blue-900">Status: Pending</p>
                <p className="text-xs text-blue-700">Waiting for host to approve your request...</p>
              </div>
            </div>
          </div>

          <div className="text-center pt-4">
            <p className="text-xs text-gray-500">
              This page will automatically update when the host responds.
            </p>
          </div>
        </div>

        <div className="mt-6 text-center">
          <button
            onClick={() => {
              localStorage.removeItem(`waiting_request_${roomLink}`);
              localStorage.removeItem(`waiting_name_${roomLink}`);
              router.back();
            }}
            className="text-sm text-gray-500 hover:text-gray-700 underline"
          >
            Cancel Request
          </button>
        </div>
      </div>
    </div>
  );
}

