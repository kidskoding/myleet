from list_node import ListNode
from solution import middle_node


def build_list(values: list[int]) -> ListNode | None:
    dummy = ListNode()
    curr = dummy
    for value in values:
        curr.next = ListNode(value)
        curr = curr.next
    return dummy.next


def test_middle_node_odd():
    assert middle_node(build_list([1, 2, 3, 4, 5])).val == 3


def test_middle_node_even_returns_second():
    assert middle_node(build_list([1, 2, 3, 4, 5, 6])).val == 4


def test_middle_node_single():
    assert middle_node(build_list([1])).val == 1
