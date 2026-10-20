from solution import OrderManagementSystem


def test_order_management_system_example_sequence():
    oms = OrderManagementSystem()
    oms.add_order(1, "buy", 1)
    oms.add_order(2, "buy", 1)
    oms.add_order(3, "sell", 2)
    assert sorted(oms.get_orders_at_price("buy", 1)) == [1, 2]
    oms.modify_order(1, 3)
    oms.modify_order(2, 1)
    assert oms.get_orders_at_price("buy", 1) == [2]
    oms.cancel_order(3)
    oms.cancel_order(2)
    assert oms.get_orders_at_price("buy", 1) == []


def test_order_management_system_empty_lookup():
    oms = OrderManagementSystem()
    assert oms.get_orders_at_price("sell", 5) == []


def test_order_management_system_types_are_separate():
    oms = OrderManagementSystem()
    oms.add_order(5, "sell", 10)
    oms.add_order(6, "buy", 10)
    assert oms.get_orders_at_price("buy", 10) == [6]
    assert oms.get_orders_at_price("sell", 10) == [5]


def test_order_management_system_modify_moves_bucket():
    oms = OrderManagementSystem()
    oms.add_order(1, "sell", 7)
    oms.add_order(2, "sell", 9)
    oms.modify_order(1, 9)
    assert oms.get_orders_at_price("sell", 7) == []
    assert sorted(oms.get_orders_at_price("sell", 9)) == [1, 2]


def test_order_management_system_cancel_after_modify():
    oms = OrderManagementSystem()
    oms.add_order(4, "buy", 100)
    oms.modify_order(4, 50)
    oms.cancel_order(4)
    assert oms.get_orders_at_price("buy", 50) == []
    assert oms.get_orders_at_price("buy", 100) == []
