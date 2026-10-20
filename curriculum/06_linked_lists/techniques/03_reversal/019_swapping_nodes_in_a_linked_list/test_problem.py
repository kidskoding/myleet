from list_node import ListNode
from solution import swap_nodes


def build_list(values: list[int]) -> ListNode | None:
    dummy = ListNode()
    curr = dummy
    for value in values:
        curr.next = ListNode(value)
        curr = curr.next
    return dummy.next


def to_list(head: ListNode | None) -> list[int]:
    values = []
    while head:
        values.append(head.val)
        head = head.next
    return values


def test_swap_nodes_normal():
    assert to_list(swap_nodes(build_list([1, 2, 3, 4, 5]), 2)) == [1, 4, 3, 2, 5]


def test_swap_nodes_longer_list():
    head = build_list([7, 9, 6, 6, 7, 8, 3, 0, 9, 5])
    assert to_list(swap_nodes(head, 5)) == [7, 9, 6, 6, 8, 7, 3, 0, 9, 5]


def test_swap_nodes_single_node():
    assert to_list(swap_nodes(build_list([1]), 1)) == [1]
