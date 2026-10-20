from list_node import ListNode
from solution import reverse_even_length_groups


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


def test_reverse_even_length_groups_normal():
    head = build_list([5, 2, 6, 3, 9, 1, 7, 3, 8, 4])
    assert to_list(reverse_even_length_groups(head)) == [5, 6, 2, 3, 9, 1, 4, 8, 3, 7]


def test_reverse_even_length_groups_short():
    assert to_list(reverse_even_length_groups(build_list([1, 1, 0, 6]))) == [1, 0, 1, 6]


def test_reverse_even_length_groups_odd_tail():
    assert to_list(reverse_even_length_groups(build_list([2, 1]))) == [2, 1]
