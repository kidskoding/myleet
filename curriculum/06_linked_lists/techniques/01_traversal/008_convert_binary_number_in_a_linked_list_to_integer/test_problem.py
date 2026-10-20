from list_node import ListNode
from solution import get_decimal_value


def build_list(values: list[int]) -> ListNode | None:
    dummy = ListNode()
    curr = dummy
    for value in values:
        curr.next = ListNode(value)
        curr = curr.next
    return dummy.next


def test_get_decimal_value_normal():
    assert get_decimal_value(build_list([1, 0, 1])) == 5


def test_get_decimal_value_zero():
    assert get_decimal_value(build_list([0])) == 0


def test_get_decimal_value_all_ones():
    assert get_decimal_value(build_list([1, 1, 1, 1])) == 15
