from list_node import ListNode
from solution import delete_nodes


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


def test_delete_nodes_example_one():
    head = build_list([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13])
    assert to_list(delete_nodes(head, 2, 3)) == [1, 2, 6, 7, 11, 12]


def test_delete_nodes_example_two():
    head = build_list([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11])
    assert to_list(delete_nodes(head, 1, 3)) == [1, 5, 9]


def test_delete_nodes_keep_one_delete_one():
    head = build_list([1, 2, 3, 4, 5, 6])
    assert to_list(delete_nodes(head, 1, 1)) == [1, 3, 5]


def test_delete_nodes_short_tail():
    head = build_list([1, 2, 3])
    assert to_list(delete_nodes(head, 2, 5)) == [1, 2]

