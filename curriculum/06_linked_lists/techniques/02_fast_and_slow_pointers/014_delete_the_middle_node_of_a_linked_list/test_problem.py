from list_node import ListNode
from solution import delete_middle


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


def test_delete_middle_odd_length():
    head = build_list([1, 3, 4, 7, 1, 2, 6])
    assert to_list(delete_middle(head)) == [1, 3, 4, 1, 2, 6]


def test_delete_middle_even_length():
    head = build_list([1, 2, 3, 4])
    assert to_list(delete_middle(head)) == [1, 2, 4]


def test_delete_middle_single_node():
    assert delete_middle(build_list([1])) is None


def test_delete_middle_two_nodes():
    assert to_list(delete_middle(build_list([2, 1]))) == [2]
