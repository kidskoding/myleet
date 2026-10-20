class OrderManagementSystem:
    def __init__(self) -> None:
        self.orders: dict[int, tuple[str, int]] = {}
        self.buckets: dict[tuple[str, int], dict[int, None]] = {}

    def add_order(self, order_id: int, order_type: str, price: int) -> None:
        self.orders[order_id] = (order_type, price)
        self.buckets.setdefault((order_type, price), {})[order_id] = None

    def modify_order(self, order_id: int, new_price: int) -> None:
        order_type, _ = self.orders[order_id]
        self.cancel_order(order_id)
        self.add_order(order_id, order_type, new_price)

    def cancel_order(self, order_id: int) -> None:
        key = self.orders.pop(order_id)
        bucket = self.buckets[key]
        del bucket[order_id]
        if not bucket:
            del self.buckets[key]

    def get_orders_at_price(self, order_type: str, price: int) -> list[int]:
        return list(self.buckets.get((order_type, price), {}))
