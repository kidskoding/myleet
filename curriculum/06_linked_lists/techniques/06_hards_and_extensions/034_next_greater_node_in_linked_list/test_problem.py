from list_node import ListNode
from solution import next_larger_nodes


def build_list(values: list[int]) -> ListNode | None:
    dummy = ListNode()
    curr = dummy
    for value in values:
        curr.next = ListNode(value)
        curr = curr.next
    return dummy.next


def test_next_larger_nodes_normal():
    assert next_larger_nodes(build_list([2, 1, 5])) == [5, 5, 0]


def test_next_larger_nodes_longer():
    assert next_larger_nodes(build_list([2, 7, 4, 3, 5])) == [7, 0, 5, 5, 0]
