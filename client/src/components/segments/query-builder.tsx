import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Trash2, Plus, Copy, Move3D } from "lucide-react";
import { cn } from "@/lib/utils";
import type { SegmentQuery, SegmentRule, SegmentGroup } from "@shared/schema";

// Field definitions with types and available operators
export const FIELD_DEFINITIONS = {
  // Basic donor fields
  firstName: { label: "First Name", type: "string", operators: ["equals", "not_equals", "contains", "not_contains", "is_null", "is_not_null"] },
  lastName: { label: "Last Name", type: "string", operators: ["equals", "not_equals", "contains", "not_contains", "is_null", "is_not_null"] },
  email: { label: "Email", type: "string", operators: ["equals", "not_equals", "contains", "not_contains", "is_null", "is_not_null"] },
  phone: { label: "Phone", type: "string", operators: ["equals", "not_equals", "contains", "not_contains", "is_null", "is_not_null"] },
  city: { label: "City", type: "string", operators: ["equals", "not_equals", "contains", "not_contains", "is_null", "is_not_null"] },
  state: { label: "State", type: "string", operators: ["equals", "not_equals", "contains", "not_contains", "is_null", "is_not_null"] },
  zipCode: { label: "Zip Code", type: "string", operators: ["equals", "not_equals", "contains", "not_contains", "is_null", "is_not_null"] },
  country: { label: "Country", type: "string", operators: ["equals", "not_equals", "contains", "not_contains"] },
  
  // School-specific fields
  donorType: { 
    label: "Donor Type", 
    type: "select", 
    operators: ["equals", "not_equals", "in", "not_in"],
    options: [
      { value: "parent", label: "Parent" },
      { value: "alumni", label: "Alumni" },
      { value: "community", label: "Community" },
      { value: "staff", label: "Staff" },
      { value: "board", label: "Board" },
      { value: "foundation", label: "Foundation" },
      { value: "business", label: "Business" }
    ]
  },
  studentName: { label: "Student Name", type: "string", operators: ["equals", "not_equals", "contains", "not_contains", "is_null", "is_not_null"] },
  gradeLevel: { label: "Grade Level", type: "string", operators: ["equals", "not_equals", "contains", "not_contains", "is_null", "is_not_null"] },
  alumniYear: { label: "Alumni Year", type: "number", operators: ["equals", "not_equals", "greater_than", "less_than", "greater_than_or_equal", "less_than_or_equal", "between", "is_null", "is_not_null"] },
  graduationYear: { label: "Graduation Year", type: "number", operators: ["equals", "not_equals", "greater_than", "less_than", "greater_than_or_equal", "less_than_or_equal", "between", "is_null", "is_not_null"] },
  
  // Engagement and analytics
  engagementLevel: { 
    label: "Engagement Level", 
    type: "select", 
    operators: ["equals", "not_equals", "in", "not_in"],
    options: [
      { value: "new", label: "New" },
      { value: "active", label: "Active" },
      { value: "engaged", label: "Engaged" },
      { value: "at_risk", label: "At Risk" },
      { value: "lapsed", label: "Lapsed" }
    ]
  },
  giftSizeTier: { 
    label: "Gift Size Tier", 
    type: "select", 
    operators: ["equals", "not_equals", "in", "not_in"],
    options: [
      { value: "grassroots", label: "Grassroots" },
      { value: "mid_level", label: "Mid Level" },
      { value: "major", label: "Major" },
      { value: "principal", label: "Principal" }
    ]
  },
  lifetimeValue: { label: "Lifetime Value", type: "currency", operators: ["equals", "not_equals", "greater_than", "less_than", "greater_than_or_equal", "less_than_or_equal", "between"] },
  averageGiftSize: { label: "Average Gift Size", type: "currency", operators: ["equals", "not_equals", "greater_than", "less_than", "greater_than_or_equal", "less_than_or_equal", "between"] },
  totalDonations: { label: "Total Donations", type: "number", operators: ["equals", "not_equals", "greater_than", "less_than", "greater_than_or_equal", "less_than_or_equal", "between"] },
  lastDonationDate: { label: "Last Donation Date", type: "date", operators: ["equals", "not_equals", "greater_than", "less_than", "greater_than_or_equal", "less_than_or_equal", "in_last_days", "not_in_last_days", "is_null", "is_not_null"] },
  firstDonationDate: { label: "First Donation Date", type: "date", operators: ["equals", "not_equals", "greater_than", "less_than", "greater_than_or_equal", "less_than_or_equal", "in_last_days", "not_in_last_days", "is_null", "is_not_null"] },
  
  // Communication preferences
  emailOptIn: { label: "Email Opt-In", type: "boolean", operators: ["equals"] },
  phoneOptIn: { label: "Phone Opt-In", type: "boolean", operators: ["equals"] },
  mailOptIn: { label: "Mail Opt-In", type: "boolean", operators: ["equals"] },
  preferredContactMethod: { 
    label: "Preferred Contact Method", 
    type: "select", 
    operators: ["equals", "not_equals", "in", "not_in"],
    options: [
      { value: "email", label: "Email" },
      { value: "phone", label: "Phone" },
      { value: "mail", label: "Mail" },
      { value: "text", label: "Text" }
    ]
  },
  
  // System fields
  createdAt: { label: "Created Date", type: "date", operators: ["equals", "not_equals", "greater_than", "less_than", "greater_than_or_equal", "less_than_or_equal", "in_last_days", "not_in_last_days"] },
  updatedAt: { label: "Last Updated", type: "date", operators: ["equals", "not_equals", "greater_than", "less_than", "greater_than_or_equal", "less_than_or_equal", "in_last_days", "not_in_last_days"] }
};

export const OPERATOR_LABELS = {
  equals: "equals",
  not_equals: "does not equal",
  greater_than: "is greater than",
  less_than: "is less than", 
  greater_than_or_equal: "is greater than or equal to",
  less_than_or_equal: "is less than or equal to",
  contains: "contains",
  not_contains: "does not contain",
  in: "is one of",
  not_in: "is not one of",
  between: "is between",
  is_null: "is empty",
  is_not_null: "is not empty",
  in_last_days: "in the last X days",
  not_in_last_days: "not in the last X days"
};

interface QueryBuilderProps {
  value: SegmentQuery;
  onChange: (query: SegmentQuery) => void;
  onPreview?: (query: SegmentQuery) => void;
  className?: string;
}

interface RuleBuilderProps {
  rule: SegmentRule;
  onChange: (rule: SegmentRule) => void;
  onRemove: () => void;
  canRemove?: boolean;
}

interface GroupBuilderProps {
  group: SegmentGroup;
  onChange: (group: SegmentGroup) => void;
  onRemove: () => void;
  canRemove?: boolean;
  depth?: number;
}

// Generate unique IDs
const generateId = () => Math.random().toString(36).substr(2, 9);

// Rule Builder Component
function RuleBuilder({ rule, onChange, onRemove, canRemove = true }: RuleBuilderProps) {
  const fieldDef = FIELD_DEFINITIONS[rule.field as keyof typeof FIELD_DEFINITIONS];
  const availableOperators = fieldDef?.operators || [];

  const updateRule = (updates: Partial<SegmentRule>) => {
    onChange({ ...rule, ...updates });
  };

  const renderValueInput = () => {
    const fieldType = fieldDef?.type || 'string';
    const operator = rule.operator;

    // No value input needed for null checks
    if (operator === 'is_null' || operator === 'is_not_null') {
      return null;
    }

    // Multi-select for 'in' and 'not_in' operators
    if (operator === 'in' || operator === 'not_in') {
      if (fieldDef?.options) {
        return (
          <div className="space-y-2">
            <Label className="text-sm font-medium">Select values:</Label>
            <div className="flex flex-wrap gap-2">
              {fieldDef.options.map((option) => {
                const isSelected = Array.isArray(rule.value) && rule.value.includes(option.value);
                return (
                  <Badge
                    key={option.value}
                    variant={isSelected ? "default" : "outline"}
                    className="cursor-pointer"
                    onClick={() => {
                      const currentValues = Array.isArray(rule.value) ? rule.value : [];
                      const newValues = isSelected 
                        ? currentValues.filter(v => v !== option.value)
                        : [...currentValues, option.value];
                      updateRule({ value: newValues });
                    }}
                    data-testid={`value-option-${option.value}`}
                  >
                    {option.label}
                  </Badge>
                );
              })}
            </div>
          </div>
        );
      } else {
        return (
          <Textarea
            placeholder="Enter comma-separated values"
            value={Array.isArray(rule.value) ? rule.value.join(', ') : ''}
            onChange={(e) => {
              const values = e.target.value.split(',').map(v => v.trim()).filter(v => v);
              updateRule({ value: values });
            }}
            data-testid="input-multivalue"
          />
        );
      }
    }

    // Between operator needs two values
    if (operator === 'between') {
      const values = Array.isArray(rule.value) ? rule.value : ['', ''];
      return (
        <div className="grid grid-cols-2 gap-2">
          <Input
            type={fieldType === 'number' || fieldType === 'currency' ? 'number' : fieldType === 'date' ? 'date' : 'text'}
            placeholder="Min value"
            value={values[0] || ''}
            onChange={(e) => updateRule({ value: [e.target.value, values[1]] })}
            data-testid="input-between-min"
          />
          <Input
            type={fieldType === 'number' || fieldType === 'currency' ? 'number' : fieldType === 'date' ? 'date' : 'text'}
            placeholder="Max value"
            value={values[1] || ''}
            onChange={(e) => updateRule({ value: [values[0], e.target.value] })}
            data-testid="input-between-max"
          />
        </div>
      );
    }

    // Boolean select
    if (fieldType === 'boolean') {
      return (
        <Select value={String(rule.value)} onValueChange={(value) => updateRule({ value: value === 'true' })}>
          <SelectTrigger data-testid="select-boolean-value">
            <SelectValue placeholder="Select value" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="true">Yes</SelectItem>
            <SelectItem value="false">No</SelectItem>
          </SelectContent>
        </Select>
      );
    }

    // Select with options
    if (fieldType === 'select' && fieldDef?.options) {
      return (
        <Select value={String(rule.value)} onValueChange={(value) => updateRule({ value })}>
          <SelectTrigger data-testid="select-option-value">
            <SelectValue placeholder="Select value" />
          </SelectTrigger>
          <SelectContent>
            {fieldDef.options.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      );
    }

    // Number of days for date operators
    if (operator === 'in_last_days' || operator === 'not_in_last_days') {
      return (
        <Input
          type="number"
          placeholder="Number of days"
          value={String(rule.value || '')}
          onChange={(e) => updateRule({ value: parseInt(e.target.value) || 0 })}
          min="1"
          data-testid="input-days"
        />
      );
    }

    // Regular input
    return (
      <Input
        type={fieldType === 'number' || fieldType === 'currency' ? 'number' : fieldType === 'date' ? 'date' : 'text'}
        placeholder="Enter value"
        value={String(rule.value || '')}
        onChange={(e) => {
          const value = fieldType === 'number' || fieldType === 'currency' 
            ? (e.target.value ? parseFloat(e.target.value) : '') 
            : e.target.value;
          updateRule({ value });
        }}
        step={fieldType === 'currency' ? '0.01' : undefined}
        data-testid="input-rule-value"
      />
    );
  };

  return (
    <Card className="bg-white dark:bg-gray-800">
      <CardContent className="p-4">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 items-end">
          <div>
            <Label className="text-sm font-medium">Field</Label>
            <Select
              value={rule.field}
              onValueChange={(field) => {
                // Reset operator and value when field changes
                updateRule({ 
                  field, 
                  operator: FIELD_DEFINITIONS[field as keyof typeof FIELD_DEFINITIONS]?.operators[0] as any || 'equals',
                  value: undefined 
                });
              }}
            >
              <SelectTrigger data-testid="select-rule-field">
                <SelectValue placeholder="Select field" />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(FIELD_DEFINITIONS).map(([key, def]) => (
                  <SelectItem key={key} value={key}>
                    {def.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-sm font-medium">Operator</Label>
            <Select
              value={rule.operator}
              onValueChange={(operator) => updateRule({ operator: operator as any, value: undefined })}
            >
              <SelectTrigger data-testid="select-rule-operator">
                <SelectValue placeholder="Select operator" />
              </SelectTrigger>
              <SelectContent>
                {availableOperators.map((op) => (
                  <SelectItem key={op} value={op}>
                    {OPERATOR_LABELS[op as keyof typeof OPERATOR_LABELS]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-sm font-medium">Value</Label>
            {renderValueInput()}
          </div>

          <div className="flex gap-2">
            {canRemove && (
              <Button
                variant="outline"
                size="sm"
                onClick={onRemove}
                className="text-red-600 hover:text-red-700"
                data-testid="button-remove-rule"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Group Builder Component
function GroupBuilder({ group, onChange, onRemove, canRemove = true, depth = 0 }: GroupBuilderProps) {
  const updateGroup = (updates: Partial<SegmentGroup>) => {
    onChange({ ...group, ...updates });
  };

  const addRule = () => {
    const newRule: SegmentRule = {
      id: generateId(),
      field: 'firstName',
      operator: 'equals',
      value: ''
    };
    updateGroup({ rules: [...group.rules, newRule] });
  };

  const addGroup = () => {
    const newGroup: SegmentGroup = {
      id: generateId(),
      combinator: 'and',
      rules: [{
        id: generateId(),
        field: 'firstName',
        operator: 'equals',
        value: ''
      }]
    };
    updateGroup({ rules: [...group.rules, newGroup] });
  };

  const updateRule = (index: number, rule: SegmentRule | SegmentGroup) => {
    const newRules = [...group.rules];
    newRules[index] = rule;
    updateGroup({ rules: newRules });
  };

  const removeRule = (index: number) => {
    const newRules = group.rules.filter((_, i) => i !== index);
    updateGroup({ rules: newRules });
  };

  return (
    <Card className={cn(
      "border-2 border-dashed",
      depth === 0 ? "border-blue-200 dark:border-blue-800" : "border-gray-300 dark:border-gray-600"
    )}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Switch
                checked={group.not}
                onCheckedChange={(not) => updateGroup({ not })}
                data-testid="switch-group-not"
              />
              <Label className="text-sm">NOT</Label>
            </div>
            <Select
              value={group.combinator}
              onValueChange={(combinator: 'and' | 'or') => updateGroup({ combinator })}
            >
              <SelectTrigger className="w-20" data-testid="select-group-combinator">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="and">AND</SelectItem>
                <SelectItem value="or">OR</SelectItem>
              </SelectContent>
            </Select>
            <Badge variant="outline" className="text-xs">
              Group {depth + 1}
            </Badge>
          </div>

          {canRemove && (
            <Button
              variant="outline"
              size="sm"
              onClick={onRemove}
              className="text-red-600 hover:text-red-700"
              data-testid="button-remove-group"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          )}
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {group.rules.map((rule, index) => (
          <div key={rule.id}>
            {index > 0 && (
              <div className="flex justify-center py-2">
                <Badge variant="outline" className="text-xs font-medium">
                  {group.combinator.toUpperCase()}
                </Badge>
              </div>
            )}
            
            {'field' in rule ? (
              <RuleBuilder
                rule={rule}
                onChange={(updatedRule) => updateRule(index, updatedRule)}
                onRemove={() => removeRule(index)}
                canRemove={group.rules.length > 1}
              />
            ) : (
              <GroupBuilder
                group={rule}
                onChange={(updatedGroup) => updateRule(index, updatedGroup)}
                onRemove={() => removeRule(index)}
                canRemove={group.rules.length > 1}
                depth={depth + 1}
              />
            )}
          </div>
        ))}

        <Separator />
        
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={addRule}
            data-testid="button-add-rule"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Rule
          </Button>
          
          {depth < 2 && ( // Limit nesting depth
            <Button
              variant="outline"
              size="sm"
              onClick={addGroup}
              data-testid="button-add-group"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Group
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// Main Query Builder Component
export function QueryBuilder({ value, onChange, onPreview, className }: QueryBuilderProps) {
  const [previewCount, setPreviewCount] = useState<number | null>(null);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);

  // Auto-preview on query changes (debounced)
  useEffect(() => {
    if (!onPreview) return;
    
    const timeoutId = setTimeout(() => {
      if (value && value.rules.length > 0) {
        setIsPreviewLoading(true);
        onPreview(value);
      }
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [value, onPreview]);

  const handlePreviewResult = (count: number) => {
    setPreviewCount(count);
    setIsPreviewLoading(false);
  };

  return (
    <div className={cn("space-y-4", className)}>
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Query Builder</h3>
          <p className="text-sm text-muted-foreground">
            Build complex donor segments using multiple criteria
          </p>
        </div>
        
        {previewCount !== null && (
          <Badge variant="secondary" className="text-sm">
            {isPreviewLoading ? "Calculating..." : `${previewCount.toLocaleString()} donors`}
          </Badge>
        )}
      </div>

      <GroupBuilder
        group={value}
        onChange={onChange}
        onRemove={() => {}} // Root group cannot be removed
        canRemove={false}
        depth={0}
      />
    </div>
  );
}

export default QueryBuilder;