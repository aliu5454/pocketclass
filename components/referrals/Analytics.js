import React, { useState, useEffect } from "react";
import {
  ChartBarIcon,
  TrendingUpIcon,
  CalendarIcon,
  EyeIcon,
  UsersIcon,
  CashIcon,
} from "@heroicons/react/outline";
import { Card, Select, DatePicker, Typography } from "antd";

const { Title, Text } = Typography;
const { Option } = Select;
const { RangePicker } = DatePicker;

const Analytics = ({ instructorStats, userId }) => {
  const [timeRange, setTimeRange] = useState("30days");
  const [analyticsData, setAnalyticsData] = useState({
    referralTrends: [],
    conversionRates: {},
    topPerformingClasses: [],
    revenueBreakdown: {},
  });

  useEffect(() => {
    fetchAnalyticsData();
  }, [timeRange, userId]);

  const fetchAnalyticsData = async () => {
    try {
      const response = await fetch(`/api/referrals/analytics?userId=${userId}&timeRange=${timeRange}`);
      const result = await response.json();
      
      if (response.ok && result.success) {
        setAnalyticsData(result.analytics);
      }
    } catch (error) {
      console.error("Error fetching analytics data:", error);
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header with Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <ChartBarIcon className="w-6 h-6 text-gray-600" />
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Analytics</h3>
            <p className="text-sm text-gray-600">Track your referral program performance</p>
          </div>
        </div>
        <div className="flex items-center space-x-3">
          <Select
            value={timeRange}
            onChange={setTimeRange}
            style={{ width: 150 }}
          >
            <Option value="7days">Last 7 Days</Option>
            <Option value="30days">Last 30 Days</Option>
            <Option value="90days">Last 90 Days</Option>
            <Option value="12months">Last 12 Months</Option>
          </Select>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="text-center">
          <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-3">
            <EyeIcon className="w-6 h-6 text-blue-600" />
          </div>
          <Text className="text-sm text-gray-600">Total Views</Text>
          <Title level={3} className="!mb-0">{analyticsData.totalViews || 0}</Title>
        </Card>

        <Card className="text-center">
          <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mx-auto mb-3">
            <UsersIcon className="w-6 h-6 text-green-600" />
          </div>
          <Text className="text-sm text-gray-600">Conversion Rate</Text>
          <Title level={3} className="!mb-0">{analyticsData.conversionRate || 0}%</Title>
        </Card>

        <Card className="text-center">
          <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center mx-auto mb-3">
            <TrendingUpIcon className="w-6 h-6 text-yellow-600" />
          </div>
          <Text className="text-sm text-gray-600">Avg. Revenue per Referral</Text>
          <Title level={3} className="!mb-0">${analyticsData.avgRevenuePerReferral || 0}</Title>
        </Card>

        <Card className="text-center">
          <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mx-auto mb-3">
            <CashIcon className="w-6 h-6 text-purple-600" />
          </div>
          <Text className="text-sm text-gray-600">Total Referral Revenue</Text>
          <Title level={3} className="!mb-0">${instructorStats.totalReferralRevenue || 0}</Title>
        </Card>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Referral Trends */}
        <Card title="Referral Trends" className="h-96">
          <div className="h-full flex items-center justify-center text-gray-500">
            {analyticsData.referralTrends && analyticsData.referralTrends.length > 0 ? (
              <div className="w-full">
                {/* Simple trend visualization */}
                <div className="space-y-3">
                  {analyticsData.referralTrends.slice(0, 5).map((trend, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">{trend.date}</span>
                      <div className="flex items-center space-x-2">
                        <div className="w-32 bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-logo-red h-2 rounded-full" 
                            style={{ width: `${(trend.referrals / 10) * 100}%` }}
                          ></div>
                        </div>
                        <span className="text-sm font-medium">{trend.referrals}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-center">
                <ChartBarIcon className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                <p>No trend data available yet</p>
              </div>
            )}
          </div>
        </Card>

        {/* Top Performing Classes */}
        <Card title="Top Performing Classes" className="h-96">
          <div className="h-full">
            {analyticsData.topPerformingClasses && analyticsData.topPerformingClasses.length > 0 ? (
              <div className="space-y-4">
                {analyticsData.topPerformingClasses.map((classData, index) => (
                  <div key={classData.classId} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold ${
                        index === 0 ? 'bg-yellow-500' : index === 1 ? 'bg-gray-400' : 'bg-yellow-600'
                      }`}>
                        {index + 1}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{classData.className}</p>
                        <p className="text-sm text-gray-600">{classData.referralCount} referrals</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-medium text-gray-900">${classData.revenue}</p>
                      <p className="text-sm text-gray-600">revenue</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex items-center justify-center h-full text-gray-500">
                <div className="text-center">
                  <TrendingUpIcon className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                  <p>No class performance data yet</p>
                </div>
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* Detailed Metrics */}
      <Card title="Detailed Metrics">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="text-center p-4 border-r border-gray-200">
            <Title level={4} className="!mb-1">{analyticsData.totalClicks || 0}</Title>
            <Text className="text-gray-600">Total Link Clicks</Text>
          </div>
          <div className="text-center p-4 border-r border-gray-200">
            <Title level={4} className="!mb-1">{analyticsData.uniqueVisitors || 0}</Title>
            <Text className="text-gray-600">Unique Visitors</Text>
          </div>
          <div className="text-center p-4">
            <Title level={4} className="!mb-1">{analyticsData.repeatReferrers || 0}</Title>
            <Text className="text-gray-600">Repeat Referrers</Text>
          </div>
        </div>
      </Card>

      {/* Revenue Breakdown */}
      <Card title="Revenue Breakdown">
        <div className="space-y-4">
          <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
            <span className="font-medium text-green-800">Direct Referral Earnings</span>
            <span className="font-bold text-green-900">${analyticsData.directEarnings || 0}</span>
          </div>
          <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg">
            <span className="font-medium text-blue-800">Bonus Incentives</span>
            <span className="font-bold text-blue-900">${analyticsData.bonusEarnings || 0}</span>
          </div>
          <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg border-t-2 border-gray-200">
            <span className="font-semibold text-gray-800">Total Revenue</span>
            <span className="font-bold text-gray-900 text-lg">${(analyticsData.directEarnings || 0) + (analyticsData.bonusEarnings || 0)}</span>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default Analytics;
