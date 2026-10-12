import React, { useState, useEffect } from 'react';
import { Link, useOutletContext } from 'react-router-dom';
import { getFiles, getTotalSpaceUsed } from '../api/files';
import type { FileDoc, TotalSpace } from '../types';
import { convertFileSize, formatDateTime, getUsageSummary } from '../utils';
import UsageChart from '../components/UsageChart';
import Card from '../components/Card';

export const Dashboard: React.FC = () => {
  const { refreshTrigger, handleRefresh } = useOutletContext<{
    refreshTrigger: number;
    handleRefresh: () => void;
  }>();

  const [files, setFiles] = useState<FileDoc[]>([]);
  const [totalSpace, setTotalSpace] = useState<TotalSpace>({
    document: { size: 0, latestDate: '' },
    image: { size: 0, latestDate: '' },
    video: { size: 0, latestDate: '' },
    audio: { size: 0, latestDate: '' },
    other: { size: 0, latestDate: '' },
    used: 0,
    all: 2 * 1024 * 1024 * 1024,
  });
  const [isLoading, setIsLoading] = useState(true);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [filesRes, spaceRes] = await Promise.all([
        getFiles({ limit: 10 }),
        getTotalSpaceUsed(),
      ]);
      setFiles(filesRes.documents || []);
      setTotalSpace(spaceRes);
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [refreshTrigger]);

  const summary = getUsageSummary(totalSpace);

  return (
    <div className="dashboard-container max-w-7xl mx-auto space-y-8">
      {/* Storage Overview */}
      <section>
        <UsageChart used={totalSpace.used} />

        {/* Categories summary list */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {summary.map((item) => (
            <Link
              to={item.url}
              key={item.title}
              className="bg-white border border-light-300 rounded-[20px] p-5 shadow-drop-1 hover:shadow-drop-2 hover:border-brand/40 transition-all duration-300 block"
            >
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <div className="size-14 rounded-2xl bg-light-400 flex items-center justify-center p-2.5">
                    <img
                      src={item.icon}
                      alt={item.title}
                      className="size-full object-contain"
                    />
                  </div>
                  <h4 className="h4 text-dark-100 font-bold">
                    {convertFileSize(item.size)}
                  </h4>
                </div>

                <div>
                  <h5 className="subtitle-1 font-semibold text-light-100 mb-1">
                    {item.title}
                  </h5>
                  <div className="h-px bg-light-300 my-2" />
                  <p className="caption text-light-200">
                    {item.latestDate ? formatDateTime(item.latestDate) : 'No files'}
                  </p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Recent Files */}
      <section className="dashboard-recent-files">
        <div className="flex items-center justify-between mb-5">
          <h2 className="h2 text-dark-100 font-bold">Recent files uploaded</h2>
          <span className="caption text-light-200">
            {files.length} {files.length === 1 ? 'file' : 'files'}
          </span>
        </div>

        {isLoading ? (
          <div className="flex justify-center items-center py-16">
            <img
              src="/assets/icons/loader.svg"
              alt="loading"
              className="size-8 animate-spin text-brand"
            />
          </div>
        ) : files.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {files.map((file) => (
              <Card
                key={file._id || file.$id}
                file={file}
                onRefresh={handleRefresh}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-16 bg-light-400/50 rounded-2xl border border-dashed border-light-300">
            <img
              src="/assets/images/files.png"
              alt="No files"
              className="size-20 mx-auto opacity-50 mb-3"
            />
            <p className="body-1 text-light-200">No files uploaded yet</p>
          </div>
        )}
      </section>
    </div>
  );
};

export default Dashboard;
