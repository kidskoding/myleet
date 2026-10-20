class OrderManagementSystem:
    # Problem 889: Design Order Management System
    # Time:
    # Space:

    def __init__(self) -> None:
        raise NotImplementedError

    def add_order(self, order_id: int, order_type: str, price: int) -> None:
        raise NotImplementedError

    def modify_order(self, order_id: int, new_price: int) -> None:
        raise NotImplementedError

    def cancel_order(self, order_id: int) -> None:
        raise NotImplementedError

    def get_orders_at_price(self, order_type: str, price: int) -> list[int]:
        raise NotImplementedError
