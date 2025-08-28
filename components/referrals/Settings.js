import React from "react";
import { Switch, Card, Typography, Select, InputNumber } from "antd";
import {
  CogIcon,
  InformationCircleIcon,
  GiftIcon,
} from "@heroicons/react/outline";
import Link from "next/link";

const { Text } = Typography;
const { Option } = Select;

const Settings = ({ 
  instructorClasses, 
  referralSettings, 
  savingSettings, 
  toggleReferralForClass, 
  updateClassSetting 
}) => {
  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center space-x-3 mb-6">
        <CogIcon className="w-6 h-6 text-gray-600" />
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Referral Settings</h3>
          <p className="text-sm text-gray-600">Configure referral programs for your classes</p>
        </div>
      </div>

      {instructorClasses && instructorClasses.length > 0 ? (
        <div className="space-y-6">
          {instructorClasses.map((classData) => {
            const classSettings = referralSettings?.classes?.[classData.id] || {};
            const isEnabled = classSettings.enabled || false;

            return (
              <Card key={classData.id} className="border border-gray-200">
                <div className="space-y-4">
                  {/* Class Header */}
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <h4 className="font-semibold text-gray-900">{classData.Name}</h4>
                      <p className="text-sm text-gray-600">{classData.Description}</p>
                      <p className="text-sm text-gray-500">${classData.Price} per session</p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Text className="text-sm">Enable Referrals</Text>
                      <Switch
                        checked={isEnabled}
                        onChange={(checked) => toggleReferralForClass(classData.id, checked)}
                        loading={savingSettings}
                      />
                    </div>
                  </div>

                  {/* Settings Panel */}
                  {isEnabled && (
                    <div className="border-t pt-4 space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Student Discount */}
                        <div className="space-y-2">
                          <label className="block text-sm font-medium text-gray-700">
                            Student Discount
                          </label>
                          <div className="flex space-x-2">
                            <Select
                              value={classSettings.studentDiscountType || "percentage"}
                              onChange={(value) => updateClassSetting(classData.id, "studentDiscountType", value)}
                              style={{ width: 120 }}
                            >
                              <Option value="percentage">%</Option>
                              <Option value="fixed">$</Option>
                            </Select>
                            <InputNumber
                              value={classSettings.studentDiscountValue || 10}
                              onChange={(value) => updateClassSetting(classData.id, "studentDiscountValue", value)}
                              min={1}
                              max={classSettings.studentDiscountType === "percentage" ? 100 : parseFloat(classData.Price)}
                              style={{ flex: 1 }}
                            />
                          </div>
                        </div>

                        {/* Referrer Reward */}
                        <div className="space-y-2">
                          <label className="block text-sm font-medium text-gray-700">
                            Referrer Reward
                          </label>
                          <div className="flex space-x-2">
                            <Select
                              value={classSettings.referrerRewardType || "percentage"}
                              onChange={(value) => updateClassSetting(classData.id, "referrerRewardType", value)}
                              style={{ width: 120 }}
                            >
                              <Option value="percentage">%</Option>
                              <Option value="fixed">$</Option>
                            </Select>
                            <InputNumber
                              value={classSettings.referrerRewardValue || 15}
                              onChange={(value) => updateClassSetting(classData.id, "referrerRewardValue", value)}
                              min={1}
                              max={classSettings.referrerRewardType === "percentage" ? 100 : parseFloat(classData.Price)}
                              style={{ flex: 1 }}
                            />
                          </div>
                        </div>

                        {/* Max Redemptions */}
                        <div className="space-y-2">
                          <label className="block text-sm font-medium text-gray-700">
                            Max Redemptions
                          </label>
                          <InputNumber
                            value={classSettings.maxRedemptions || 100}
                            onChange={(value) => updateClassSetting(classData.id, "maxRedemptions", value)}
                            min={1}
                            max={1000}
                            style={{ width: "100%" }}
                          />
                        </div>

                        {/* Expiry Days */}
                        <div className="space-y-2">
                          <label className="block text-sm font-medium text-gray-700">
                            Expiry (Days)
                          </label>
                          <InputNumber
                            value={classSettings.expiryDays || 30}
                            onChange={(value) => updateClassSetting(classData.id, "expiryDays", value)}
                            min={1}
                            max={365}
                            style={{ width: "100%" }}
                          />
                        </div>
                      </div>

                      {/* Info Section */}
                      <div className="bg-blue-50 p-4 rounded-lg">
                        <div className="flex items-start space-x-3">
                          <InformationCircleIcon className="w-5 h-5 text-blue-600 mt-0.5" />
                          <div className="text-sm text-blue-800">
                            <p className="font-medium mb-1">How this works:</p>
                            <ul className="space-y-1 text-xs">
                              <li>• Students get {classSettings.studentDiscountValue || 10}{classSettings.studentDiscountType === "percentage" ? "%" : "$"} off their first booking</li>
                              <li>• Referrers earn {classSettings.referrerRewardValue || 15}{classSettings.referrerRewardType === "percentage" ? "%" : "$"} for each successful referral</li>
                              <li>• Referral links expire after {classSettings.expiryDays || 30} days</li>
                              <li>• Maximum {classSettings.maxRedemptions || 100} redemptions allowed</li>
                            </ul>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-8">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <GiftIcon className="w-8 h-8 text-gray-400" />
          </div>
          <h4 className="text-lg font-medium text-gray-900 mb-2">No Classes Found</h4>
          <p className="text-gray-600 mb-4">Create your first class to set up referral programs!</p>
          <Link href="/createClass">
            <a className="bg-logo-red text-white px-6 py-3 rounded-lg hover:bg-logo-red/90 transition-colors">
              Create Class
            </a>
          </Link>
        </div>
      )}
    </div>
  );
};

export default Settings;
