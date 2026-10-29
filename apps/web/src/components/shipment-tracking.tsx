import { Shipment } from '../lib/api';
import { label, shipmentStatusLabels } from '../lib/labels';

export function ShipmentTracking({ shipment }: { shipment: Shipment }) {
  return (
    <section
      className="tracking"
      aria-label={`Rastreio da remessa ${shipment.trackingCode}`}
    >
      <p>
        <strong>Rastreio {shipment.trackingCode}</strong> ·{' '}
        {shipment.carrierName} ·{' '}
        <span
          className={`status-badge status-${shipment.status.toLowerCase()}`}
        >
          {label(shipmentStatusLabels, shipment.status)}
        </span>
      </p>
      {shipment.estimatedDeliveryAt && !shipment.deliveredAt && (
        <small className="table-subtext">
          Previsão de entrega:{' '}
          {new Date(shipment.estimatedDeliveryAt).toLocaleDateString('pt-BR')}
        </small>
      )}
      <ol className="tracking-timeline">
        {shipment.events.map((event) => (
          <li key={event.id}>
            <strong>{label(shipmentStatusLabels, event.status)}</strong> —{' '}
            {event.description}
            <small>
              {new Date(event.createdAt).toLocaleString('pt-BR')}
              {event.location ? ` · ${event.location}` : ''}
            </small>
          </li>
        ))}
      </ol>
    </section>
  );
}
