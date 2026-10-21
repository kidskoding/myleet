from list_node import ListNode


def insertion_sort_list(head: ListNode | None) -> ListNode | None:
    # Problem 40: Insertion Sort List
    # Time: O(n^2)
    # Space: O(1)

    dummy = ListNode(0)
    curr = head

    while curr is not None:
        nxt = curr.next
        prev = dummy
        while prev.next is not None and prev.next.val < curr.val:
            prev = prev.next
        curr.next = prev.next
        prev.next = curr
        curr = nxt

    return dummy.next
