from list_node import ListNode
from solution import remove_nodes


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


def test_remove_nodes_normal():
    assert to_list(remove_nodes(build_list([5, 2, 13, 3, 8]))) == [13, 8]


def test_remove_nodes_all_equal_are_kept():
    assert to_list(remove_nodes(build_list([1, 1, 1, 1]))) == [1, 1, 1, 1]
