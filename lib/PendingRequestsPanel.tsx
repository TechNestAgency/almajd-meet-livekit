'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { X, Check, XCircle, Users } from 'lucide-react';
import { toastWithSound, toastSuccess, toastError } from './toast-with-sound';

interface PendingRequest {
  id: string;
  name: string;
  status: string;
  createdAt: string;
}

interface PendingRequestsPanelProps {
  roomLink: string;
  hostPassword?: string; // Optional - some rooms may not have password
  isOpen: boolean;
  onClose: () => void;
}

export function PendingRequestsPanel({
  roomLink,
  hostPassword,
  isOpen,
  onClose
}: PendingRequestsPanelProps) {
  const [requests, setRequests] = useState<PendingRequest[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isProcessing, setIsProcessing] = useState<string | null>(null);
  const isInitialLoadRef = useRef(true);
  const notifiedRequestIdsRef = useRef<Set<string>>(new Set());

  const fetchPendingRequests = useCallback(async (showLoading = false) => {
    if (!isOpen || !roomLink) return;

    if (showLoading) {
      setIsLoading(true);
    }
    try {
      const url = `/api/room/waiting-list?roomLink=${encodeURIComponent(roomLink)}`;
      const finalUrl = hostPassword ? `${url}&password=${encodeURIComponent(hostPassword)}` : url;
      const response = await fetch(finalUrl);

      if (response.ok) {
        const data = await response.json();
        const newRequests = data.requests || [];
        
        // Only update if requests actually changed to prevent unnecessary re-renders
        setRequests(prev => {
          // Quick check: if lengths are different, definitely update
          if (prev.length !== newRequests.length) {
            return newRequests;
          }
          
          // Check if any IDs are different
          const prevIds = prev.map(r => r.id).sort().join(',');
          const newIds = newRequests.map((r: PendingRequest) => r.id).sort().join(',');
          
          if (prevIds !== newIds) {
            return newRequests;
          }
          
          // Same IDs, return previous to prevent re-render
          return prev;
        });
      } else {
        console.error('Failed to fetch pending requests');
      }
    } catch (error) {
      console.error('Error fetching pending requests:', error);
    } finally {
      if (showLoading) {
        setIsLoading(false);
      }
      isInitialLoadRef.current = false;
    }
  }, [isOpen, roomLink, hostPassword]);

  // Fetch requests when panel opens
  useEffect(() => {
    if (isOpen) {
      // Show loading only on initial load
      fetchPendingRequests(true);
      // Poll for new requests every 3 seconds without showing loading spinner
      const interval = setInterval(() => fetchPendingRequests(false), 3000);
      return () => clearInterval(interval);
    } else {
      // Reset when panel closes
      isInitialLoadRef.current = true;
      notifiedRequestIdsRef.current.clear();
    }
  }, [isOpen, fetchPendingRequests]);

  const handleApprove = async (requestId: string, studentName: string) => {
    setIsProcessing(requestId);
    try {
      const response = await fetch('/api/room/approve-participant', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          requestId,
          roomLink,
          password: hostPassword || '', // Empty string if no password
          action: 'APPROVE'
        }),
      });

      if (response.ok) {
        toastSuccess(`${studentName} has been approved and can now join the meeting`, {
          duration: 5000,
        });
        // Remove approved request from list
        setRequests(prev => prev.filter(req => req.id !== requestId));
        // Refresh to get updated list
        setTimeout(fetchPendingRequests, 500);
      } else {
        const error = await response.json();
        toastError(error.error || 'Failed to approve request');
      }
    } catch (error) {
      toastError('Failed to approve request. Please try again.');
    } finally {
      setIsProcessing(null);
    }
  };

  const handleReject = async (requestId: string, studentName: string) => {
    setIsProcessing(requestId);
    try {
      const response = await fetch('/api/room/approve-participant', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          requestId,
          roomLink,
          password: hostPassword || '', // Empty string if no password
          action: 'REJECT'
        }),
      });

      if (response.ok) {
        toastSuccess(`${studentName}'s request has been rejected`, {
          duration: 3000,
        });
        // Remove rejected request from list
        setRequests(prev => prev.filter(req => req.id !== requestId));
        // Refresh to get updated list
        setTimeout(fetchPendingRequests, 500);
      } else {
        const error = await response.json();
        toastError(error.error || 'Failed to reject request');
      }
    } catch (error) {
      toastError('Failed to reject request. Please try again.');
    } finally {
      setIsProcessing(null);
    }
  };

  // Show notification when new request arrives (only once per request)
  useEffect(() => {
    if (requests.length > 0 && isOpen) {
      // Find requests we haven't notified about yet
      const newRequests = requests.filter(req => {
        if (notifiedRequestIdsRef.current.has(req.id)) {
          return false; // Already notified
        }
        // Mark as notified
        notifiedRequestIdsRef.current.add(req.id);
        return true;
      });

      // Show notification for new requests (only once)
      if (newRequests.length > 0) {
        newRequests.forEach(req => {
          toastWithSound(
            <div>
              <div style={{ fontWeight: '600', marginBottom: '4px' }}>
                New Student Request
              </div>
              <div style={{ fontSize: '13px', color: '#6b7280' }}>
                {req.name} wants to join the meeting
              </div>
            </div>,
            {
              duration: 6000,
              position: 'top-right',
            }
          );
        });
      }
    }
  }, [requests, isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[80vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <Users className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Pending Requests</h2>
              <p className="text-sm text-gray-500">
                {requests.length} {requests.length === 1 ? 'request' : 'requests'} waiting
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 transition-colors rounded-lg hover:bg-gray-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : requests.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Users className="w-8 h-8 text-gray-400" />
              </div>
              <p className="text-gray-500">No pending requests</p>
              <p className="text-sm text-gray-400 mt-2">
                Students will appear here when they request to join
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {requests.map((request) => (
                <div
                  key={request.id}
                  className="bg-gray-50 border border-gray-200 rounded-lg p-4 hover:bg-gray-100 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">{request.name}</p>
                      <p className="text-xs text-gray-500 mt-1">
                        Requested {new Date(request.createdAt).toLocaleTimeString()}
                      </p>
                    </div>
                    <div className="flex items-center space-x-2 ml-4">
                      <button
                        onClick={() => handleApprove(request.id, request.name)}
                        disabled={isProcessing === request.id}
                        className="p-2 bg-green-100 hover:bg-green-200 text-green-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        title="Approve"
                      >
                        <Check className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleReject(request.id, request.name)}
                        disabled={isProcessing === request.id}
                        className="p-2 bg-red-100 hover:bg-red-200 text-red-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        title="Reject"
                      >
                        <XCircle className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  {isProcessing === request.id && (
                    <div className="mt-2 flex items-center text-xs text-gray-500">
                      <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-gray-400 mr-2"></div>
                      Processing...
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200 bg-gray-50">
          <p className="text-xs text-gray-500 text-center">
            Requests are automatically refreshed every few seconds
          </p>
        </div>
      </div>
    </div>
  );
}

