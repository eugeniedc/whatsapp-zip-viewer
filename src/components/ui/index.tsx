import React from 'react'

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode
}

export const Button: React.FC<ButtonProps> = ({ children, className, ...props }) => {
  return (
    <button
      className={`px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 ${className || ''}`}
      {...props}
    >
      {children}
    </button>
  )
}

interface CardProps {
  children: React.ReactNode
  className?: string
}

export const Card: React.FC<CardProps> = ({ children, className }) => {
  return (
    <div className={`border rounded-lg shadow-md bg-white ${className || ''}`}>
      {children}
    </div>
  )
}

export const CardHeader: React.FC<CardProps> = ({ children, className }) => {
  return (
    <div className={`p-6 pb-4 ${className || ''}`}>
      {children}
    </div>
  )
}

export const CardContent: React.FC<CardProps> = ({ children, className }) => {
  return (
    <div className={`p-6 pt-0 ${className || ''}`}>
      {children}
    </div>
  )
}

export const CardTitle: React.FC<CardProps> = ({ children, className }) => {
  return (
    <h2 className={`text-xl font-semibold ${className || ''}`}>
      {children}
    </h2>
  )
}

export const CardDescription: React.FC<CardProps> = ({ children, className }) => {
  return (
    <p className={`text-gray-600 mt-1 ${className || ''}`}>
      {children}
    </p>
  )
}

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(({ className, ...props }, ref) => {
  return (
    <input
      ref={ref}
      className={`w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 ${className || ''}`}
      {...props}
    />
  )
})

interface LabelProps extends React.LabelHTMLAttributes<HTMLLabelElement> {
  children: React.ReactNode
}

export const Label: React.FC<LabelProps> = ({ children, className, ...props }) => {
  return (
    <label className={`block text-sm font-medium text-gray-700 mb-1 ${className || ''}`} {...props}>
      {children}
    </label>
  )
}

interface DatePickerProps {
  id?: string
  value?: Date
  onChange?: (date: Date | undefined) => void
  placeholder?: string
  className?: string
}

export const DatePicker: React.FC<DatePickerProps> = ({ id, value, onChange, placeholder, className }) => {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const dateValue = e.target.value
    if (dateValue) {
      onChange?.(new Date(dateValue))
    } else {
      onChange?.(undefined)
    }
  }

  return (
    <input
      id={id}
      type="date"
      value={value ? value.toISOString().split('T')[0] : ''}
      onChange={handleChange}
      placeholder={placeholder}
      className={`w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 ${className || ''}`}
    />
  )
}