import React, { useState } from 'react';
import axios from 'axios';

const API_BASE_URL = 'http://localhost:5000/api/pagination'; // Assuming your backend runs on port 5000

const PaginationConfigurator: React.FC = () => {
    const [url, setUrl] = useState<string>('');
    const [maxPages, setMaxPages] = useState<number>(1);
    const [manualSelector, setManualSelector] = useState<string>('');
    const [manualType, setManualType] = useState<'numbered' | 'next-prev' | 'load-more' | 'infinite-scroll' | ''>('');
    const [textPattern, setTextPattern] = useState<string>('');
    const [detectionResult, setDetectionResult] = useState<string>('');
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);

    const handleDetect = async () => {
        setIsLoading(true);
        setError(null);
        setDetectionResult('');
        try {
            const response = await axios.post(`${API_BASE_URL}/detect-pagination`, { url });
            setDetectionResult(JSON.stringify(response.data.pattern, null, 2));
        } catch (err: any) {
            setError(err.response?.data?.message || err.message);
        } finally {
            setIsLoading(false);
        }
    };

    const handleTest = async () => {
        setIsLoading(true);
        setError(null);
        setDetectionResult('');
        try {
            if (!manualSelector || !manualType) {
                setError('Please provide a Custom Selector and Pagination Type for testing.');
                setIsLoading(false);
                return;
            }

            const pattern = {
                selector: manualSelector,
                type: manualType,
                textPattern: textPattern || undefined,
            };
            const response = await axios.post(`${API_BASE_URL}/test-pagination-pattern`, {
                url,
                pattern,
                pageLimit: maxPages,
            });
            setDetectionResult(JSON.stringify(response.data.results, null, 2));
        } catch (err: any) {
            setError(err.response?.data?.message || err.message);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div style={{ padding: '20px', maxWidth: '600px', margin: 'auto', border: '1px solid #ccc', borderRadius: '8px' }}>
            <h2>Pagination Configurator</h2>

            <div style={{ marginBottom: '15px' }}>
                <label style={{ display: 'block', marginBottom: '5px' }}>Target URL:</label>
                <input
                    type="text"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    placeholder="e.g., https://example.com/products"
                    style={{ width: '100%', padding: '8px', boxSizing: 'border-box' }}
                    disabled={isLoading}
                />
            </div>

            <div style={{ marginBottom: '15px' }}>
                <label style={{ display: 'block', marginBottom: '5px' }}>Max Pages to Scrape:</label>
                <input
                    type="number"
                    value={maxPages}
                    onChange={(e) => setMaxPages(Number(e.target.value))}
                    min="1"
                    style={{ width: '100%', padding: '8px', boxSizing: 'border-box' }}
                    disabled={isLoading}
                />
            </div>

            <h3>Manual Override (Optional)</h3>
            <div style={{ marginBottom: '15px' }}>
                <label style={{ display: 'block', marginBottom: '5px' }}>Custom Selector:</label>
                <input
                    type="text"
                    value={manualSelector}
                    onChange={(e) => setManualSelector(e.target.value)}
                    placeholder="e.g., .next-button"
                    style={{ width: '100%', padding: '8px', boxSizing: 'border-box' }}
                    disabled={isLoading}
                />
            </div>

            <div style={{ marginBottom: '15px' }}>
                <label style={{ display: 'block', marginBottom: '5px' }}>Pagination Type:</label>
                <select
                    value={manualType}
                    onChange={(e) => setManualType(e.target.value as any)}
                    style={{ width: '100%', padding: '8px', boxSizing: 'border-box' }}
                    disabled={isLoading}
                >
                    <option value="">Select Type</option>
                    <option value="numbered">Numbered (1, 2, 3)</option>
                    <option value="next-prev">Next/Previous Links</option>
                    <option value="load-more">Load More Button</option>
                    <option value="infinite-scroll">Infinite Scroll</option>
                </select>
            </div>

            <div style={{ marginBottom: '15px' }}>
                <label style={{ display: 'block', marginBottom: '5px' }}>Text Pattern (Regex for selector content):</label>
                <input
                    type="text"
                    value={textPattern}
                    onChange={(e) => setTextPattern(e.target.value)}
                    placeholder="e.g., next|continue"
                    style={{ width: '100%', padding: '8px', boxSizing: 'border-box' }}
                    disabled={isLoading}
                />
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '15px' }}>
                <button
                    onClick={handleDetect}
                    style={{ padding: '10px 20px', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' }}
                    disabled={isLoading}
                >
                    {isLoading ? 'Detecting...' : 'Detect Patterns'}
                </button>
                <button
                    onClick={handleTest}
                    style={{ padding: '10px 20px', backgroundColor: '#28a745', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' }}
                    disabled={isLoading}
                >
                    {isLoading ? 'Testing...' : 'Test Pagination'}
                </button>
            </div>

            {isLoading && <div style={{ color: '#007bff', marginBottom: '10px' }}>Loading...</div>}
            {error && <div style={{ color: 'red', marginBottom: '10px' }}>Error: {error}</div>}

            {detectionResult && (
                <div style={{ marginTop: '20px', padding: '10px', border: '1px dashed #007bff', borderRadius: '5px', backgroundColor: '#e9f7ff' }}>
                    <strong>Result:</strong>
                    <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>{detectionResult}</pre>
                </div>
            )}
        </div>
    );
};

export default PaginationConfigurator;