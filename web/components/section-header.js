export function SectionHeader({ title, description }) {
  return (
    <div className="sm:flex sm:items-center">
      <div className="sm:flex-auto">
        <h2 className="text-base/7 font-semibold text-gray-900">{title}</h2>
        {description ? (
          <p className="mt-2 text-sm/6 text-gray-600">{description}</p>
        ) : null}
      </div>
    </div>
  );
}
